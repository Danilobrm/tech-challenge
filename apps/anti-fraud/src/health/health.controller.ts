import { Controller, Get } from '@nestjs/common';

export interface HealthCheck {
  status: 'ok';
  service: string;
}

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthCheck {
    return { status: 'ok', service: 'anti-fraud' };
  }
}
