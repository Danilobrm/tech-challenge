import { z } from 'zod';

/**
 * Vocabulario publico do status. O enum do banco (`PENDING`, `APPROVED`, `REJECTED`) e
 * detalhe de armazenamento; a API fala este, tanto na resposta quanto no filtro — filtrar
 * por um nome diferente do que a leitura devolve seria pedir traducao ao cliente.
 */
export const transactionStatusLabelSchema = z.enum(['pending', 'approved', 'rejected']);

export type TransactionStatusLabel = z.infer<typeof transactionStatusLabelSchema>;

export const DEFAULT_PAGE_SIZE = 20;

/**
 * Teto do tamanho de pagina. Sem ele o cliente escolhe o custo da consulta, e uma pagina
 * de cem mil linhas derruba a memoria do processo antes de virar resposta.
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Teto do numero da pagina. O custo do `OFFSET` cresce com o deslocamento — o banco varre
 * e descarta tudo o que foi pulado — entao limitar so o tamanho da pagina deixaria a outra
 * metade do custo na mao do cliente. Este e o ponto em que paginar por deslocamento deixa
 * de fazer sentido e a resposta passa a ser cursor.
 */
export const MAX_PAGE = 1_000;

/**
 * Fronteira de periodo. So instante completo com fuso: `2026-08-18` sozinho seria
 * ambiguo — meia-noite de qual fuso, e o `to` inclui ou nao o dia inteiro. Quem monta o
 * filtro decide isso e manda o instante ja resolvido.
 */
const instantSchema = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

/**
 * Query do GET /transactions. Tudo chega como string na querystring, entao os numeros
 * sao coagidos aqui — e nao no controller, que precisa continuar sendo adaptador fino.
 *
 * Mora nos contratos porque os filtros do dashboard montam esta mesma query: divergencia
 * entre o que a tela envia e o que a API aceita vira erro de compilacao.
 *
 * Estrito de proposito: chave desconhecida e erro, e nao campo descartado em silencio. Um
 * `transferType` no lugar de `transferTypeId` devolveria a lista inteira sem filtro nenhum,
 * e o cliente nao teria como perceber que o filtro foi ignorado.
 */
export const listTransactionsQuerySchema = z
  .strictObject({
    status: transactionStatusLabelSchema.optional(),
    transferTypeId: z.coerce.number().int().positive().optional(),
    from: instantSchema.optional(),
    to: instantSchema.optional(),
    page: z.coerce.number().int().positive().max(MAX_PAGE).default(1),
    pageSize: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  })
  .refine((query) => query.from === undefined || query.to === undefined || query.from <= query.to, {
    message: 'from deve ser anterior ou igual a to',
    path: ['from'],
  });

export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;

/**
 * Uma transacao como a leitura devolve. E o formato do enunciado, e mora aqui pelo mesmo
 * motivo da query acima: o presenter da API deriva este tipo e o dashboard valida a
 * resposta com este schema, entao renomear um campo de um lado quebra a compilacao do
 * outro em vez de quebrar a tela do usuario.
 */
export const transactionViewSchema = z.object({
  transactionExternalId: z.uuid(),
  transactionType: z.object({ name: z.string() }),
  transactionStatus: z.object({ name: transactionStatusLabelSchema }),
  value: z.number(),
  createdAt: z.iso.datetime(),
});

export type TransactionView = z.infer<typeof transactionViewSchema>;

/** Metadados que o cliente precisa para navegar sem adivinhar onde a lista acaba. */
export const pageMetadataSchema = z.object({
  page: z.int().positive(),
  pageSize: z.int().positive(),
  total: z.int().nonnegative(),
  // Zero paginas quando nao ha nada — a listagem nao promete uma pagina vazia.
  totalPages: z.int().nonnegative(),
});

export type PageMetadata = z.infer<typeof pageMetadataSchema>;

export const listTransactionsResponseSchema = z.object({
  items: z.array(transactionViewSchema),
  pagination: pageMetadataSchema,
});

export type ListTransactionsResponse = z.infer<typeof listTransactionsResponseSchema>;
