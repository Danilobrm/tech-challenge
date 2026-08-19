/**
 * Mensagem legivel de qualquer coisa lancada. O que chega no `catch` nao e
 * necessariamente um `Error`, e gravar `[object Object]` no `lastError` nao ajuda ninguem
 * a entender por que a publicacao falhou.
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    // `JSON.stringify` devolve `undefined` para `undefined` e para funcao, e lanca em
    // referencia circular e em `BigInt`. Como esta funcao so e chamada de dentro de um
    // `catch`, deixar qualquer um desses casos escapar trocaria o erro original por um
    // erro na descricao dele.
    return JSON.stringify(error) ?? String(error);
  } catch {
    return String(error);
  }
}
