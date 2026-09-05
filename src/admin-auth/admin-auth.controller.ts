import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AdminAuthService } from './admin-auth.service';
import { AdminAuthParms } from './admin-auth.dto';
import { AdminAuthGuard } from '@/common/guards/admin-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AdminUser } from '../common/types/current-user';

@Controller('admin')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() payload: AdminAuthParms) {
    return this.adminAuthService.login(payload);
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  me(@CurrentUser() user: AdminUser) {
    return user;
  }
}
