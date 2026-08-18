import { randomUUID } from 'node:crypto';

/** Identidade da mensagem publicada. E o que o consumidor usa para deduplicar reentrega. */
export interface IdGenerator {
  next(): string;
}

export class RandomIdGenerator implements IdGenerator {
  next(): string {
    return randomUUID();
  }
}
