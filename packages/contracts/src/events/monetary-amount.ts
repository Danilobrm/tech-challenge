import { z } from 'zod';

/**
 * Valor monetario no fio: string decimal com exatamente duas casas, espelhando o
 * `NUMERIC(18,2)` do banco.
 *
 * Nao e `number` de proposito. A regra da antifraude e uma comparacao de fronteira
 * (`> 1000` rejeita, `1000` exato aprova) e o antifraude nao tem banco nem Decimal do
 * Prisma para reconstruir o valor — serializar como binario de ponto flutuante deixaria
 * o limite a merce de como cada lado parseou o numero.
 */
export const monetaryAmountSchema = z.string().regex(/^\d{1,16}\.\d{2}$/, {
  message: 'valor deve ser uma string decimal com duas casas, ex.: "1000.00"',
});

export type MonetaryAmount = z.infer<typeof monetaryAmountSchema>;
