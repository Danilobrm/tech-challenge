/**
 * Token em arquivo proprio: o publicador precisa dele e o modulo precisa do publicador.
 * Declarado dentro do modulo, o ciclo de importacao resolve o token como `undefined` em
 * runtime, e o container falha ao injetar o cliente.
 */
export const KAFKA_PRODUCER = 'KAFKA_PRODUCER';
