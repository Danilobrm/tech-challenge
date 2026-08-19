import { z } from 'zod';

/**
 * Variaveis exigidas pelo servico de transacoes. O boot falha aqui, e nao no primeiro
 * request, quando o ambiente esta incompleto.
 */
const envSchema = z.object({
  TRANSACTIONS_PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.url(),
  KAFKA_BROKERS: z.string().min(1),
  KAFKA_CLIENT_ID: z.string().min(1),
  KAFKA_GROUP_ID_TRANSACTIONS: z.string().min(1),
  /**
   * Origem do dashboard. O navegador so entrega a resposta a um script de outra origem se
   * ela vier autorizada, e dashboard e API sobem em portas diferentes — o que ja e origem
   * diferente. Vem do ambiente porque em producao nao e `localhost`.
   *
   * Normalizada para origem pura: o CORS compara com o cabecalho `Origin`, que nunca tem
   * barra final nem caminho. Um `http://localhost:3000/` no `.env` bloquearia o dashboard
   * inteiro, e o sintoma seria um erro de rede generico no navegador.
   */
  WEB_ORIGIN: z.url().transform((value) => new URL(value).origin),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Variaveis de ambiente invalidas ou ausentes: ${issues}`);
  }

  return result.data;
}
