import { Module } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogImagesService } from './catalog-images.service';
import { CatalogController } from './catalog.controller';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, CatalogImagesService],
})
export class CatalogModule {}
