import { Module } from '@nestjs/common';

import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminAuthGuard } from '@/common/guards/admin-auth.guard';

@Module({
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService, AdminAuthGuard],
})
export class AdminDashboardModule {}
