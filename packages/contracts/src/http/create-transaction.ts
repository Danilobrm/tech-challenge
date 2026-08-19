import { z } from 'zod';

import type { MonetaryAmount } from '../shared/monetary-amount';

/**
 * Teto do valor aceito na entrada. O `NUMERIC(18,2)` do banco comporta mais, mas o corpo
 * da requisicao e JSON: acima disso `value * 100` sai da faixa exata de `Number`, e um
 * numero que chega arredondado nao tem como ser recuperado depois.
 */
export const MAX_TRANSACTION_VALUE = 9_999_999_999_999.99;

/**
 * Corpo do POST /transactions, no formato do enunciado. Mora nos contratos porque o
 * formulario do dashboard valida com o mesmo schema que a API — divergencia entre os dois
 * vira erro de compilacao, nao um 400 descoberto pelo usuario.
 *
 * As mensagens sao escritas aqui, e nao no formulario, porque tem dois leitores: o campo do
 * dashboard, que mostra a frase sob o rotulo, e o corpo do 400 da API, que responde a quem
 * chama pelo `curl`. Deixar o texto padrao do Zod entregaria "Too small: expected number to
 * be >0" para o usuario final.
 */
export const createTransactionSchema = z.object({
  accountExternalIdDebit: z.uuid({ error: 'informe um identificador de conta valido' }),
  accountExternalIdCredit: z.uuid({ error: 'informe um identificador de conta valido' }),
  transferTypeId: z.int({ error: 'escolha o tipo de transferencia' }).positive({
    error: 'escolha o tipo de transferencia',
  }),
  value: z
    .number({ error: 'informe o valor da transacao' })
    .positive({ error: 'valor deve ser maior que zero' })
    .max(MAX_TRANSACTION_VALUE, { error: 'valor acima do maximo aceito' })
    // Dinheiro tem duas casas: 10.005 nao e um valor valido, e aceitar seria decidir
    // silenciosamente por quem paga se arredonda para cima ou para baixo.
    .refine((value) => Number(value.toFixed(2)) === value, {
      error: 'valor deve ter no maximo duas casas decimais',
    }),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

/**
 * Converte o valor da borda HTTP para o formato do fio. So e seguro depois do schema:
 * ele e quem garante que o numero cabe em duas casas e na faixa exata de `Number`.
 */
export function toMonetaryAmount(value: number): MonetaryAmount {
  return value.toFixed(2);
}
