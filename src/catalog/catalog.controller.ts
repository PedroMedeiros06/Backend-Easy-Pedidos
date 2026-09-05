import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CatalogService } from './catalog.service';
import {
  CreateCatalogItemDto,
  ListCatalogItemsQueryDto,
  UpdateCatalogItemDto,
} from './dto/catalog.dto';

import { CompanyAuthGuard } from '@/common/guards/company-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermission } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { CompanyUser } from '@/common/types/current-user';
import { Permissions } from '@/common/permissions/permissions';

@Controller('catalog-items')
@UseGuards(CompanyAuthGuard, PermissionsGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @RequirePermission(Permissions.CatalogView)
  list(
    @CurrentUser() user: CompanyUser,
    @Query() query: ListCatalogItemsQueryDto,
  ) {
    return this.catalogService.list(user.companyId, query);
  }

  @Post()
  @RequirePermission(Permissions.CatalogManage)
  create(
    @CurrentUser() user: CompanyUser,
    @Body() payload: CreateCatalogItemDto,
  ) {
    return this.catalogService.create(user.companyId, payload);
  }

  @Put(':id')
  @RequirePermission(Permissions.CatalogManage)
  update(
    @CurrentUser() user: CompanyUser,
    @Param('id') id: string,
    @Body() payload: UpdateCatalogItemDto,
  ) {
    return this.catalogService.update(user.companyId, id, payload);
  }

  @Delete(':id')
  @RequirePermission(Permissions.CatalogManage)
  remove(@CurrentUser() user: CompanyUser, @Param('id') id: string) {
    return this.catalogService.remove(user.companyId, id);
  }
}
