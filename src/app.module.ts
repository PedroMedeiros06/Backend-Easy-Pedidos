import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { CompaniesModule } from './companies/companies.module';
import { MembersModule } from './members/members.module';
import { CategoriesModule } from './categories/categories.module';
import { CatalogModule } from './catalog/catalog.module';
import { StockModule } from './stock/stock.module';
import { IntegrationsModule } from './integrations/integrations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    SupabaseModule,

    AuthModule,
    AdminAuthModule,
    CompaniesModule,
    MembersModule,
    CategoriesModule,
    CatalogModule,
    StockModule,
    IntegrationsModule,
  ],
})
export class AppModule {}
