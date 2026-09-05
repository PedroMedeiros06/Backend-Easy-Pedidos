import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { AuthParms } from './auth.dto';
import { CompanyAuthGuard } from '@/common/guards/company-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { CompanyUser } from '../common/types/current-user';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() payload: AuthParms) {
    return this.authService.login(payload);
  }

  @Get('me')
  @UseGuards(CompanyAuthGuard)
  me(@CurrentUser() user: CompanyUser) {
    return user;
  }
}
