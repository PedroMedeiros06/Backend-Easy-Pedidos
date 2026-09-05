import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { StorefrontService } from './storefront.service';
import { CreateOrderDto } from '@/orders/dto/orders.dto';

// Rotas públicas, sem autenticação — consumidas pela vitrine digital do estabelecimento.
@Controller('storefront/:companyCode')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get()
  getStorefront(@Param('companyCode') companyCode: string) {
    return this.storefrontService.getStorefront(companyCode);
  }

  @Post('orders')
  createOrder(
    @Param('companyCode') companyCode: string,
    @Body() payload: CreateOrderDto,
  ) {
    return this.storefrontService.createOrder(companyCode, payload);
  }
}
