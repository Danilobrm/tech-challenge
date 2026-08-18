import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Cada app tem o proprio config (ambiente e arquivos), e a raiz apenas os agrega para
    // que `pnpm test` rode tudo em uma passada.
    projects: ['apps/*', 'packages/*'],
  },
});
