import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from './config/env';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Existe um unico .env, na raiz do monorepo — o mesmo que o enunciado manda criar
      // com `cp .env.example .env`.
      envFilePath: '../../.env',
      validate: validateEnv,
    }),
  ],
  controllers: [HealthController],
})
export class AppModule {}
