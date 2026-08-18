import { resolve } from 'node:path';

import { config as loadEnvFile } from 'dotenv';
import type { NextConfig } from 'next';

// O Next so le .env do diretorio do proprio app, e o monorepo tem um unico .env na raiz —
// o mesmo que o enunciado manda criar com `cp .env.example .env`.
loadEnvFile({ path: resolve(process.cwd(), '../../.env') });

const nextConfig: NextConfig = {};

export default nextConfig;
