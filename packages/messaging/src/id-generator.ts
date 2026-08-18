import { randomUUID } from 'node:crypto';

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
