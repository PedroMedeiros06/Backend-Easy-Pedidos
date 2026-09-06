import { Module } from '@nestjs/common';

import { AdminHealthController } from './admin-health.controller';
import { AdminHealthService } from './admin-health.service';
import { AdminAuthGuard } from '@/common/guards/admin-auth.guard';

@Module({
  controllers: [AdminHealthController],
  providers: [AdminHealthService, AdminAuthGuard],
})
export class AdminHealthModule {}
