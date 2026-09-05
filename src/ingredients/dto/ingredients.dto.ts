import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateIngredientDto {
  @IsNotEmpty({ message: 'O nome do ingrediente é obrigatório.' })
  @IsString()
  ingredientName!: string;

  @IsIn(['ml', 'g', 'unid'], {
    message: 'A unidade deve ser "ml", "g" ou "unid".',
  })
  unit!: 'ml' | 'g' | 'unid';

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockAt?: number;
}

export class UpdateIngredientDto extends PartialType(CreateIngredientDto) {}

export class AdjustIngredientDto {
  @IsNumber()
  delta!: number; // positivo para adicionar, negativo para remover
}
