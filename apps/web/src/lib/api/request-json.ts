import { z } from 'zod';

import { parseClientEnv } from '@/lib/env';
import { ApiError } from '@/lib/api/api-error';

/**
 * O acesso a variavel e escrito por extenso de proposito: o Next substitui
 * `process.env.NEXT_PUBLIC_API_URL` pelo valor em tempo de build, e so reconhece essa forma
 * — `process.env[nome]` chegaria ao navegador como `undefined`.
 *
 * Resolvida a cada chamada, e nao no topo do modulo: importar a tela nao pode derrubar o
 * bundle inteiro por causa de uma variavel ausente.
 */
function apiBaseUrl(): string {
  return parseClientEnv({ NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL })
    .NEXT_PUBLIC_API_URL;
}

function buildUrl(path: string, searchParams: Record<string, string>): URL {
  const base = apiBaseUrl().replace(/\/+$/, '');
  const url = new URL(`${base}/${path.replace(/^\/+/, '')}`);

  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  return url;
}

/**
 * O corpo do erro da API costuma dizer o que esta errado ("from deve ser anterior ou igual
 * a to"). Descartar isso deixaria o usuario com um numero de status para interpretar.
 */
const apiErrorBodySchema = z.object({
  message: z.union([z.string(), z.array(z.string())]),
  /**
   * O 400 de schema da API vem com um item por campo. Sem eles, a mensagem sozinha diz
   * apenas "requisicao invalida", e quem le nao descobre qual campo recusou.
   */
  issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

async function describeHttpFailure(response: Response): Promise<string> {
  const fallback = `A API respondeu com o status ${response.status}.`;

  let body: unknown;

  try {
    body = await response.json();
  } catch {
    // Corpo vazio ou que nao e JSON: o status sozinho ja e a informacao que sobrou.
    return fallback;
  }

  const parsed = apiErrorBodySchema.safeParse(body);

  if (!parsed.success) {
    return fallback;
  }

  const detail = Array.isArray(parsed.data.message)
    ? parsed.data.message.join('; ')
    : parsed.data.message;

  // O caminho vem vazio quando o que falhou nao e um campo do corpo, e sim um valor solto —
  // um parametro de rota, por exemplo. "`: Invalid UUID`" nao explicaria nada a ninguem.
  const issues = (parsed.data.issues ?? []).map((issue) =>
    issue.path === '' ? issue.message : `${issue.path}: ${issue.message}`,
  );

  if (issues.length > 0) {
    return `${detail === '' ? fallback : detail} (${issues.join('; ')})`;
  }

  return detail === '' ? fallback : detail;
}

export interface JsonRequest<T> {
  path: string;
  method?: 'GET' | 'POST';
  /** Ja serializados: quem chama decide o que entra na query, e o que fica de fora. */
  searchParams?: Record<string, string> | undefined;
  /** Corpo ja validado pelo schema de entrada. Vira JSON aqui, e so aqui. */
  body?: unknown;
  /** O contrato da resposta. Corpo fora do formato e erro tratado, nao `undefined` solto. */
  schema: z.ZodType<T>;
  signal?: AbortSignal | undefined;
}

/**
 * Unica porta de saida para a API. Toda falha vira `ApiError` com um motivo — a tela nao
 * precisa saber a diferenca entre um `TypeError` de rede e um 500.
 */
export async function requestJson<T>({
  path,
  method = 'GET',
  searchParams = {},
  body,
  schema,
  signal,
}: JsonRequest<T>): Promise<T> {
  const init: RequestInit = { method, headers: { accept: 'application/json' } };

  if (body !== undefined) {
    init.headers = { ...init.headers, 'content-type': 'application/json' };
    init.body = JSON.stringify(body);
  }

  if (signal !== undefined) {
    init.signal = signal;
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path, searchParams), init);
  } catch (error) {
    // Cancelamento nao e falha: quem abortou foi a propria tela, trocando de filtro. Sobe
    // como esta para o chamador reconhecer e ignorar.
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }

    throw new ApiError('network', 'Nao foi possivel falar com a API.', { cause: error });
  }

  if (!response.ok) {
    throw new ApiError('http', await describeHttpFailure(response), { status: response.status });
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch (error) {
    throw new ApiError('payload', 'A API respondeu algo que nao e JSON.', { cause: error });
  }

  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw new ApiError('payload', 'A resposta da API nao bate com o formato esperado.', {
      cause: parsed.error,
    });
  }

  return parsed.data;
}
