import { Module } from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { StorefrontController } from './storefront.controller';
import { OrdersModule } from '@/orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [StorefrontController],
  providers: [StorefrontService],
})
export class StorefrontModule {}
