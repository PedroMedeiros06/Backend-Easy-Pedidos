import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { StockService } from './stock.service';
import { AdjustStockDto, UpsertStockDto } from './dto/stock.dto';

import { CompanyAuthGuard } from '@/common/guards/company-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermission } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { CompanyUser } from '@/common/types/current-user';
import { Permissions } from '@/common/permissions/permissions';

@Controller('stock')
@UseGuards(CompanyAuthGuard, PermissionsGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @RequirePermission(Permissions.StockView)
  list(@CurrentUser() user: CompanyUser) {
    return this.stockService.list(user.companyId);
  }

  @Post()
  @RequirePermission(Permissions.StockCreate)
  upsert(@CurrentUser() user: CompanyUser, @Body() payload: UpsertStockDto) {
    return this.stockService.upsert(user.companyId, payload);
  }

  @Patch(':id/adjust')
  @RequirePermission(Permissions.StockUpdate)
  adjust(
    @CurrentUser() user: CompanyUser,
    @Param('id') id: string,
    @Body() payload: AdjustStockDto,
  ) {
    return this.stockService.adjust(user.companyId, id, payload);
  }
}
