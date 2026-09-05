import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemInputDto {
  @IsUUID()
  itemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  addonIngredientIds?: string[];
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'O pedido precisa ter ao menos um item.' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items!: OrderItemInputDto[];

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsIn(['value', 'percentage'])
  discountType?: 'value' | 'percentage';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOrderStatusDto {
  @IsIn(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'])
  status!:
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'ready'
    | 'completed'
    | 'cancelled';
}

export class ListOrdersQueryDto {
  @IsOptional()
  @IsIn(['pdv', 'storefront'])
  origin?: 'pdv' | 'storefront';

  @IsOptional()
  @IsIn(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
