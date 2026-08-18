/**
 * Contratos compartilhados entre os servicos.
 *
 * Publicador e consumidor importam o mesmo schema: divergencia de payload vira erro de
 * compilacao no monorepo, em vez de mensagem descartada em runtime.
 */

export * from './events/envelope';
export * from './events/json';
export * from './events/monetary-amount';
export * from './events/topics';
export * from './events/transaction-created';
export * from './events/transaction-status-updated';
export * from './http/create-transaction';
