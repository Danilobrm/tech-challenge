import { z } from 'zod';

/**
 * Variaveis que o dashboard consome no navegador. Precisam do prefixo NEXT_PUBLIC_ para o
 * Next embuti-las no bundle.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

export function parseClientEnv(raw: Record<string, unknown>): ClientEnv {
  const result = clientEnvSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Variaveis de ambiente invalidas ou ausentes: ${issues}`);
  }

  return result.data;
}
