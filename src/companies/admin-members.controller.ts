import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';

import { MembersService } from '@/members/members.service';
import {
  CreateMemberDto,
  ListMembersQueryDto,
  UpdateMemberDto,
  UpdateMemberStatusDto,
} from '@/members/dto/members.dto';
import { AdminAuthGuard } from '@/common/guards/admin-auth.guard';

@Controller('companies/:companyId/members')
@UseGuards(AdminAuthGuard)
export class AdminMembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  list(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query() query: ListMembersQueryDto,
  ) {
    return this.membersService.list(companyId, query);
  }

  @Post()
  create(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() payload: CreateMemberDto,
  ) {
    return this.membersService.create(companyId, payload);
  }

  @Put(':memberId')
  update(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Param('memberId') memberId: string,
    @Body() payload: UpdateMemberDto,
  ) {
    return this.membersService.update(companyId, memberId, payload);
  }

  @Patch(':memberId/status')
  updateStatus(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Param('memberId') memberId: string,
    @Body() payload: UpdateMemberStatusDto,
  ) {
    return this.membersService.updateStatus(companyId, memberId, payload);
  }
}
