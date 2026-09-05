import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  ListOrdersQueryDto,
  UpdateOrderStatusDto,
} from './dto/orders.dto';

import { CompanyAuthGuard } from '@/common/guards/company-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermission } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { CompanyUser } from '@/common/types/current-user';
import { Permissions } from '@/common/permissions/permissions';

@Controller('orders')
@UseGuards(CompanyAuthGuard, PermissionsGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @RequirePermission(Permissions.OrdersView)
  list(@CurrentUser() user: CompanyUser, @Query() query: ListOrdersQueryDto) {
    return this.ordersService.list(user.companyId, query);
  }

  @Post()
  @RequirePermission(Permissions.OrdersCreate)
  create(@CurrentUser() user: CompanyUser, @Body() payload: CreateOrderDto) {
    return this.ordersService.create(
      user.companyId,
      'pdv',
      payload,
      user.memberId,
    );
  }

  @Patch(':id/status')
  @RequirePermission(Permissions.OrdersChangeStatus)
  updateStatus(
    @CurrentUser() user: CompanyUser,
    @Param('id') id: string,
    @Body() payload: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(user.companyId, id, payload);
  }
}
