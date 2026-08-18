/**
 * Fiacao de mensageria compartilhada pelos dois servicos: produtor Kafka, criacao dos
 * topicos e as duas dependencias que carimbam toda mensagem — hora do fato e identidade.
 */

export * from './clock';
export * from './id-generator';
export * from './kafka/ensure-topics';
export * from './kafka/kafka-event.publisher';
export * from './kafka/kafka-producer.module';
export * from './kafka/kafka.tokens';
