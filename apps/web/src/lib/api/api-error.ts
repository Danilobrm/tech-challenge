/**
 * Por que a leitura falhou. O dashboard mostra a mesma acao ("tentar novamente") nos tres
 * casos, mas nao a mesma frase: "a API nao respondeu" e "a API respondeu algo que esta tela
 * nao entende" mandam o usuario para lugares diferentes.
 */
export type ApiErrorKind =
  /** A requisicao nao chegou: servico fora do ar, DNS, rede. */
  | 'network'
  /** Chegou e voltou com status de erro. */
  | 'http'
  /** Voltou 200 com um corpo que nao bate com o contrato. */
  | 'payload';

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    options?: { cause: unknown },
  ) {
    super(message, options);
    this.name = 'ApiError';
  }
}
