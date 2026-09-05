import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { IngredientsService } from './ingredients.service';
import {
  AdjustIngredientDto,
  CreateIngredientDto,
  UpdateIngredientDto,
} from './dto/ingredients.dto';

import { CompanyAuthGuard } from '@/common/guards/company-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermission } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { CompanyUser } from '@/common/types/current-user';
import { Permissions } from '@/common/permissions/permissions';

@Controller('ingredients')
@UseGuards(CompanyAuthGuard, PermissionsGuard)
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Get()
  @RequirePermission(Permissions.StockView)
  list(@CurrentUser() user: CompanyUser) {
    return this.ingredientsService.list(user.companyId);
  }

  @Post()
  @RequirePermission(Permissions.StockCreate)
  create(
    @CurrentUser() user: CompanyUser,
    @Body() payload: CreateIngredientDto,
  ) {
    return this.ingredientsService.create(user.companyId, payload);
  }

  @Put(':id')
  @RequirePermission(Permissions.StockUpdate)
  update(
    @CurrentUser() user: CompanyUser,
    @Param('id') id: string,
    @Body() payload: UpdateIngredientDto,
  ) {
    return this.ingredientsService.update(user.companyId, id, payload);
  }

  @Patch(':id/adjust')
  @RequirePermission(Permissions.StockUpdate)
  adjust(
    @CurrentUser() user: CompanyUser,
    @Param('id') id: string,
    @Body() payload: AdjustIngredientDto,
  ) {
    return this.ingredientsService.adjust(user.companyId, id, payload);
  }

  @Delete(':id')
  @RequirePermission(Permissions.StockDelete)
  remove(@CurrentUser() user: CompanyUser, @Param('id') id: string) {
    return this.ingredientsService.remove(user.companyId, id);
  }
}
