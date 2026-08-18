import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { defineConfig } from 'prisma/config';

// Existe um unico .env, na raiz do monorepo. Os comandos do Prisma rodam a partir deste
// pacote, entao o caminho e relativo a ele. Em CI nao ha arquivo: as variaveis ja vem do
// ambiente, e carregar aqui seria erro em vez de conveniencia.
const rootEnvFile = resolve(process.cwd(), '../../.env');

if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // O Prisma dispara o comando fora do PATH do pnpm, entao o `exec` e quem resolve o
    // binario local do tsx.
    seed: 'pnpm exec tsx src/database/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
