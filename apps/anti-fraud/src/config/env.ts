import { z } from 'zod';

/**
 * O antifraude e stateless: nao tem banco, entao nao exige DATABASE_URL. Tudo que precisa
 * chega no payload do evento.
 */
const envSchema = z.object({
  ANTI_FRAUD_PORT: z.coerce.number().int().positive(),
  KAFKA_BROKERS: z.string().min(1),
  KAFKA_CLIENT_ID: z.string().min(1),
  KAFKA_GROUP_ID_ANTI_FRAUD: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Variaveis de ambiente invalidas ou ausentes: ${issues}`);
  }

  return result.data;
}
