import { Kafka } from 'kafkajs';

/**
 * Mais de uma particao para que a chave de particao signifique alguma coisa: a ordem e
 * garantida dentro da particao, e e a chave que decide qual delas recebe cada mensagem.
 * Com uma so, a ordem global mascararia qualquer erro de chave.
 */
const PARTITIONS = 3;

/** Um unico broker no compose local. */
const REPLICATION_FACTOR = 1;

/**
 * Cria os topicos antes de o consumidor assinar.
 *
 * O broker esta com criacao automatica ligada, mas ela acontece como efeito colateral da
 * requisicao de metadata: a primeira responde "This server does not host this
 * topic-partition" enquanto a particao ainda nao tem lider. O erro e retriavel, o
 * transporte do Nest nao o retenta, e o processo morre no boot. `waitForLeaders` fecha
 * essa janela.
 */
export async function ensureTopics(
  clientId: string,
  brokers: string[],
  topics: readonly string[],
): Promise<void> {
  const admin = new Kafka({ clientId: `${clientId}-admin`, brokers }).admin();

  try {
    await admin.connect();
    await admin.createTopics({
      waitForLeaders: true,
      topics: topics.map((topic) => ({
        topic,
        numPartitions: PARTITIONS,
        replicationFactor: REPLICATION_FACTOR,
      })),
    });
  } finally {
    await admin.disconnect();
  }
}
