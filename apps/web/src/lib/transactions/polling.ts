import type { TransactionView } from '@challenge/contracts';

/**
 * Espaco entre duas voltas do polling. Curto o bastante para a mudanca de status parecer
 * imediata para quem acabou de criar a transacao, e longo o bastante para nao transformar
 * uma aba esquecida aberta numa fonte de carga constante na API.
 */
export const STATUS_POLL_INTERVAL_MS = 3_000;

/**
 * O gatilho do polling condicional: so ha o que esperar enquanto alguma transacao na tela
 * estiver pendente. Aprovada e rejeitada sao estados finais — a maquina de estados so
 * permite transicao a partir de `PENDING` —, entao continuar perguntando seria repetir a
 * mesma resposta para sempre.
 */
export function hasPendingTransaction(items: readonly TransactionView[]): boolean {
  return items.some((transaction) => transaction.transactionStatus.name === 'pending');
}
