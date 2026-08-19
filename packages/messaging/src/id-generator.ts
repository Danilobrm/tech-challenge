import { createHash, randomUUID } from 'node:crypto';

/**
 * Identidade da mensagem (`eventId`) e da correlacao. Injetada para o teste conseguir
 * prever o que foi publicado.
 */
export interface IdGenerator {
  next(): string;
}

export class RandomIdGenerator implements IdGenerator {
  next(): string {
    return randomUUID();
  }
}

/**
 * Identidade derivada de uma origem, para o evento que nasce como reacao a outro. Id
 * aleatorio ali quebraria a deduplicacao do consumidor: a reentrega da origem produziria
 * um `eventId` inedito, que passaria pelo `@@unique([transactionId, eventId])` como se
 * fosse um fato novo.
 */
export interface DerivedIdGenerator {
  derive(seed: string): string;
}

const HEX_UUID_LENGTH = 32;

/**
 * UUID v5 da RFC 4122 — SHA-1 sobre namespace mais nome. Mesma entrada, mesmo id, em
 * qualquer instancia e depois de qualquer reinicio. Escrito aqui porque o Node so oferece
 * uuid aleatorio, e uma dependencia nova nao se paga por vinte linhas de hash.
 */
export class UuidV5IdGenerator implements DerivedIdGenerator {
  private readonly namespace: Buffer;

  constructor(namespace: string) {
    const hex = namespace.replace(/-/g, '');

    if (!/^[0-9a-f]{32}$/i.test(hex)) {
      throw new Error('namespace do uuid v5 precisa ser um uuid');
    }

    this.namespace = Buffer.from(hex, 'hex');
  }

  derive(seed: string): string {
    const hash = createHash('sha1')
      .update(this.namespace)
      .update(seed, 'utf8')
      .digest('hex')
      .slice(0, HEX_UUID_LENGTH);

    // Os bits reservados da RFC: o nibble de versao vira 5 e os dois bits de variante
    // viram `10`. O resto do digest passa direto.
    const version = `5${hash.slice(13, 16)}`;
    const variant = ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16);

    return [
      hash.slice(0, 8),
      hash.slice(8, 12),
      version,
      `${variant}${hash.slice(18, 20)}`,
      hash.slice(20, 32),
    ].join('-');
  }
}
