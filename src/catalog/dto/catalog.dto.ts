import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class CreateCatalogItemDto {
  @IsNotEmpty({ message: 'O nome do item é obrigatório.' })
  @IsString()
  itemName!: string;

  @IsOptional()
  @IsString()
  itemDescription?: string;

  @IsInt({ message: 'O preço deve ser informado em centavos (inteiro).' })
  @Min(0)
  priceCents!: number;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsInt({ message: 'O desconto deve ser informado em centavos ou pontos percentuais, como inteiro.' })
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsIn(['value', 'percentage'])
  discountType?: 'value' | 'percentage';
}

export class UpdateCatalogItemDto extends PartialType(CreateCatalogItemDto) {
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ListCatalogItemsQueryDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
