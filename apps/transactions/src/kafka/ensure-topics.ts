import { TRANSACTION_CREATED, TRANSACTION_STATUS_UPDATED } from '@challenge/contracts';
import { Kafka } from 'kafkajs';

/**
 * Mais de uma particao para que a chave de particao signifique alguma coisa: a ordem e
 * garantida dentro da particao, e e o `transactionExternalId` que decide qual delas
 * recebe cada evento. Com uma so, ordem global mascararia o problema.
 */
const PARTITIONS = 3;

/** Um unico broker no compose local. */
const REPLICATION_FACTOR = 1;

export const FLOW_TOPICS = [TRANSACTION_CREATED, TRANSACTION_STATUS_UPDATED];

/**
 * Cria os topicos do fluxo antes de o consumidor assinar.
 *
 * O broker esta com criacao automatica ligada, mas ela acontece como efeito colateral da
 * requisicao de metadata: a primeira responde "This server does not host this
 * topic-partition" enquanto a particao ainda nao tem lider. O erro e retriavel, e o
 * transporte do Nest nao o retenta — o processo morre no boot. `waitForLeaders` fecha
 * essa janela.
 */
export async function ensureFlowTopics(clientId: string, brokers: string[]): Promise<void> {
  const admin = new Kafka({ clientId: `${clientId}-admin`, brokers }).admin();

  try {
    await admin.connect();
    await admin.createTopics({
      waitForLeaders: true,
      topics: FLOW_TOPICS.map((topic) => ({
        topic,
        numPartitions: PARTITIONS,
        replicationFactor: REPLICATION_FACTOR,
      })),
    });
  } finally {
    await admin.disconnect();
  }
}
