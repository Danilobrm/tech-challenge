/**
 * Junta classes ignorando o que for falso. Existe para o componente aceitar `className` de
 * fora sem precisar de template string com `&&` no meio do JSX.
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter((value): value is string => Boolean(value)).join(' ');
}
