/**
 * Forma do que trafega no fio e do que a coluna `jsonb` guarda. Existe para que o payload
 * de um evento nao seja tipado como `Record<string, unknown>`: o que nao serializa nao
 * pode chegar ao produtor.
 */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };
