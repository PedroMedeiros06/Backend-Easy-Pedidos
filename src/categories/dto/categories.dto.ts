import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class CreateCategoryDto {
  @IsNotEmpty({ message: 'O nome da categoria é obrigatório.' })
  @IsString()
  categoryName!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  // Desconto da categoria inteira. Empilha com o desconto do item
  // (categoria primeiro, item depois; percentuais compõem multiplicativo).
  // value = centavos; percentage = 0..100.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O desconto deve ser em centavos ou pontos percentuais (inteiro).' })
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsIn(['value', 'percentage'])
  discountType?: 'value' | 'percentage';
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ListCategoriesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
