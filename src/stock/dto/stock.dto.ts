import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class UpsertStockDto {
  @IsUUID()
  itemId!: string;

  @IsInt()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockAt?: number;
}

export class AdjustStockDto {
  @IsInt()
  delta!: number; // positive to add, negative to remove
}
