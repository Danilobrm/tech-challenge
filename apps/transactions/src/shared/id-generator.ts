import { randomUUID } from 'node:crypto';

/**
 * Identidade de mensagem (`eventId`) e de correlacao. Injetada para o teste conseguir
 * prever o que foi gravado; os ids das linhas do banco continuam vindo do `default` do
 * Prisma, que usa uuid v7 pela localidade de indice.
 */
export interface IdGenerator {
  next(): string;
}

export class RandomIdGenerator implements IdGenerator {
  next(): string {
    return randomUUID();
  }
}
