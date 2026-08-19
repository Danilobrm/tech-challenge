/**
 * Por que a chamada falhou. O dashboard mostra a mesma acao ("tentar novamente") na maioria
 * dos casos, mas nao a mesma frase: "a API nao respondeu" e "a API respondeu algo que esta
 * tela nao entende" mandam o usuario para lugares diferentes.
 */
export type ApiErrorKind =
  /** A requisicao nao chegou: servico fora do ar, DNS, rede. */
  | 'network'
  /** Chegou e voltou com status de erro. */
  | 'http'
  /** Voltou 200 com um corpo que nao bate com o contrato. */
  | 'payload';

export class ApiError extends Error {
  /**
   * Status da resposta, quando houve resposta. Existe para a tela separar "nao existe" de
   * "deu errado": um 404 nao ganha botao de tentar novamente, porque repetir a mesma
   * requisicao devolve o mesmo 404.
   */
  readonly status: number | undefined;

  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    options?: { status?: number | undefined; cause?: unknown },
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'ApiError';
    this.status = options?.status;
  }
}
