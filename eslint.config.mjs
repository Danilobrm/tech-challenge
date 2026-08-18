import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      // client do Prisma: artefato gerado, reescrito a cada `prisma generate`
      'apps/transactions/src/generated/**',
      '**/*.d.ts',
    ],
  },

  js.configs.recommended,
  tseslint.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
      parserOptions: {
        // O NestJS resolve as dependencias pelo `design:paramtypes` que o
        // `emitDecoratorMetadata` emite. Sem saber disso, o `consistent-type-imports`
        // exigiria `import type` no construtor de classe decorada — e o import apagado
        // levaria junto o metadado que o container usa para injetar.
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    },
    rules: {
      // `any` e proibido pelo guia do repositorio: tipo pouco claro se resolve perguntando,
      // nao escapando do checador.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },

  // eslint-config-prettier por ultimo: desliga apenas as regras de estilo que colidiriam
  // com o Prettier, que e quem formata.
  prettier,
);
