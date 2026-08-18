import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';

/**
 * O Prisma 7 conecta por driver adapter: quem mantem o pool de conexoes e o driver `pg`,
 * nao mais um engine proprio. A string de conexao vem sempre do ambiente.
 */
export function createPrismaAdapter(connectionString: string): PrismaPg {
  return new PrismaPg({ connectionString });
}

export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: createPrismaAdapter(connectionString) });
}
