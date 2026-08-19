import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // O Vite nao le o `paths` do tsconfig: sem este alias, o mesmo import `@/` que o Next
    // resolve em producao quebraria dentro do teste.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // Teste de tela consulta papel acessivel, e papel acessivel so existe dentro de um DOM.
    environment: 'jsdom',
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    setupFiles: ['./vitest.setup.ts'],
    env: {
      // A mesma variavel do `.env`, fixada aqui: o cliente HTTP e codigo sob teste, e a url
      // que ele monta faz parte do que esta sendo verificado.
      NEXT_PUBLIC_API_URL: 'http://api.test',
    },
  },
});
