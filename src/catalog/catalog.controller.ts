import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';

type MulterFile = Express.Multer.File;

import { CatalogService } from './catalog.service';
import { CatalogImagesService } from './catalog-images.service';
import {
  CreateCatalogItemDto,
  ListCatalogItemsQueryDto,
  UpdateCatalogItemDto,
} from './dto/catalog.dto';
import { ReorderCatalogImagesDto } from './dto/catalog-image.dto';

import { CompanyAuthGuard } from '@/common/guards/company-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermission } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { CompanyUser } from '@/common/types/current-user';
import { Permissions } from '@/common/permissions/permissions';

@Controller('catalog-items')
@UseGuards(CompanyAuthGuard, PermissionsGuard)
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly catalogImagesService: CatalogImagesService,
  ) {}

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

  @Get(':id/images')
  @RequirePermission(Permissions.CatalogView)
  listImages(@CurrentUser() user: CompanyUser, @Param('id') id: string) {
    return this.catalogImagesService.list(user.companyId, id);
  }

  @Post(':id/images')
  @RequirePermission(Permissions.CatalogManage)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: CatalogImagesService.MAX_UPLOAD_BYTES },
    }),
  )
  addImage(
    @CurrentUser() user: CompanyUser,
    @Param('id') id: string,
    @UploadedFile() file: MulterFile | undefined,
  ) {
    return this.catalogImagesService.add(user.companyId, id, file);
  }

  @Patch(':id/images/reorder')
  @RequirePermission(Permissions.CatalogManage)
  reorderImages(
    @CurrentUser() user: CompanyUser,
    @Param('id') id: string,
    @Body() payload: ReorderCatalogImagesDto,
  ) {
    return this.catalogImagesService.reorder(
      user.companyId,
      id,
      payload.imageIds,
    );
  }

  @Delete(':id/images/:imageId')
  @RequirePermission(Permissions.CatalogManage)
  removeImage(
    @CurrentUser() user: CompanyUser,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.catalogImagesService.remove(user.companyId, id, imageId);
  }
}
