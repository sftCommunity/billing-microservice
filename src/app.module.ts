import { Module } from '@nestjs/common';

import { BillingModule } from './billing/billing.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [HealthModule, BillingModule],
})
export class AppModule {}
