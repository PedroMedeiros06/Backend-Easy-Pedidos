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

import { CategoriesService } from './categories.service';
import {
  CreateCategoryDto,
  ListCategoriesQueryDto,
  UpdateCategoryDto,
} from './dto/categories.dto';

import { CompanyAuthGuard } from '@/common/guards/company-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermission } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { CompanyUser } from '@/common/types/current-user';
import { Permissions } from '@/common/permissions/permissions';

@Controller('categories')
@UseGuards(CompanyAuthGuard, PermissionsGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @RequirePermission(Permissions.CatalogView)
  list(
    @CurrentUser() user: CompanyUser,
    @Query() query: ListCategoriesQueryDto,
  ) {
    return this.categoriesService.list(user.companyId, query);
  }

  @Post()
  @RequirePermission(Permissions.CatalogManage)
  create(@CurrentUser() user: CompanyUser, @Body() payload: CreateCategoryDto) {
    return this.categoriesService.create(user.companyId, payload);
  }

  @Put(':id')
  @RequirePermission(Permissions.CatalogManage)
  update(
    @CurrentUser() user: CompanyUser,
    @Param('id') id: string,
    @Body() payload: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(user.companyId, id, payload);
  }

  @Delete(':id')
  @RequirePermission(Permissions.CatalogManage)
  remove(@CurrentUser() user: CompanyUser, @Param('id') id: string) {
    return this.categoriesService.remove(user.companyId, id);
  }
}
