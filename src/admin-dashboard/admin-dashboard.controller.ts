import { Controller, Get, UseGuards } from '@nestjs/common';

import { AdminDashboardService } from './admin-dashboard.service';
import { AdminAuthGuard } from '@/common/guards/admin-auth.guard';

@Controller('admin/dashboard')
@UseGuards(AdminAuthGuard)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  overview() {
    return this.adminDashboardService.getOverview();
  }
}
