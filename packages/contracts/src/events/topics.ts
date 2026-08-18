/**
 * Nome do topico e nome do evento sao a mesma string: um topico por tipo de evento mantem
 * o consumidor sem `switch` de roteamento e deixa o lag legivel por evento no Kafka UI.
 */
export const TRANSACTION_CREATED = 'transaction.created';
export const TRANSACTION_STATUS_UPDATED = 'transaction.status.updated';
