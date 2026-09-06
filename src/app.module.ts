import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { CompaniesModule } from './companies/companies.module';
import { MembersModule } from './members/members.module';
import { CategoriesModule } from './categories/categories.module';
import { CatalogModule } from './catalog/catalog.module';
import { IngredientsModule } from './ingredients/ingredients.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { OrdersModule } from './orders/orders.module';
import { StorefrontModule } from './storefront/storefront.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    SupabaseModule,

    AuthModule,
    AdminAuthModule,
    AdminDashboardModule,
    CompaniesModule,
    MembersModule,
    CategoriesModule,
    CatalogModule,
    IngredientsModule,
    IntegrationsModule,
    OrdersModule,
    StorefrontModule,
  ],
})
export class AppModule {}
