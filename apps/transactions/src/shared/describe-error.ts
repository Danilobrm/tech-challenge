/**
 * Mensagem legivel de qualquer coisa lancada. O que chega no `catch` nao e
 * necessariamente um `Error`, e gravar `[object Object]` no `lastError` nao ajuda ninguem
 * a entender por que a publicacao falhou.
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === 'string' ? error : JSON.stringify(error);
}
