import { TRANSFER_TYPES } from '@challenge/contracts';

import { createPrismaClient } from './prisma-client.factory.js';

// Quem carrega o .env da raiz e o prisma.config.ts, no processo que dispara o seed. Rodar
// este arquivo por fora do `pnpm db:seed` deixa a variavel ausente, e falhar aqui e mais
// util do que estourar no meio da primeira query.
const connectionString = process.env['DATABASE_URL'];

if (connectionString === undefined || connectionString === '') {
  throw new Error('DATABASE_URL ausente. Rode o seed por `pnpm db:seed`.');
}

const prisma = createPrismaClient(connectionString);

/**
 * Idempotente por construcao: o `upsert` por id deixa o seed seguro de rodar de novo num
 * banco que ja tem dados, sem duplicar tipo nem invalidar a chave estrangeira das transacoes.
 */
async function seedTransferTypes(): Promise<void> {
  for (const transferType of TRANSFER_TYPES) {
    await prisma.transferType.upsert({
      where: { id: transferType.id },
      update: { name: transferType.name },
      create: { id: transferType.id, name: transferType.name },
    });
  }

  process.stdout.write(`Seed: ${TRANSFER_TYPES.length} tipos de transferência aplicados.\n`);
}

async function run(): Promise<void> {
  try {
    await seedTransferTypes();
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error: unknown) => {
  console.error('Falha ao popular o banco de dados:', error);
  process.exitCode = 1;
});
