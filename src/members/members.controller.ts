import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { MembersService } from './members.service';
import {
  CreateMemberDto,
  ListMembersQueryDto,
  UpdateMemberDto,
  UpdateMemberStatusDto,
} from './dto/members.dto';

import { CompanyAuthGuard } from '@/common/guards/company-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermission } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { CompanyUser } from '@/common/types/current-user';
import { Permissions } from '@/common/permissions/permissions';

@Controller('members')
@UseGuards(CompanyAuthGuard, PermissionsGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @RequirePermission(Permissions.MembersView)
  list(@CurrentUser() user: CompanyUser, @Query() query: ListMembersQueryDto) {
    return this.membersService.list(user.companyId, query);
  }

  @Post()
  @RequirePermission(Permissions.MembersCreate)
  create(@CurrentUser() user: CompanyUser, @Body() payload: CreateMemberDto) {
    return this.membersService.create(user.companyId, payload);
  }

  @Put(':id')
  @RequirePermission(Permissions.MembersUpdate)
  update(
    @CurrentUser() user: CompanyUser,
    @Param('id') id: string,
    @Body() payload: UpdateMemberDto,
  ) {
    return this.membersService.update(user.companyId, id, payload);
  }

  @Patch(':id/status')
  @RequirePermission(Permissions.MembersUpdate)
  updateStatus(
    @CurrentUser() user: CompanyUser,
    @Param('id') id: string,
    @Body() payload: UpdateMemberStatusDto,
  ) {
    return this.membersService.updateStatus(user.companyId, id, payload);
  }
}
