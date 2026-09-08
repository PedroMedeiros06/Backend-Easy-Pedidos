import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class ReorderCatalogImagesDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Informe a nova ordem das imagens.' })
  @IsUUID('all', { each: true })
  imageIds!: string[];
}
