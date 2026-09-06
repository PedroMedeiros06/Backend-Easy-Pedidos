import { Controller, Get, UseGuards } from '@nestjs/common';

import { AdminHealthService } from './admin-health.service';
import { AdminAuthGuard } from '@/common/guards/admin-auth.guard';

@Controller('admin/health')
@UseGuards(AdminAuthGuard)
export class AdminHealthController {
  constructor(private readonly adminHealthService: AdminHealthService) {}

  @Get()
  health() {
    return this.adminHealthService.getHealth();
  }
}
