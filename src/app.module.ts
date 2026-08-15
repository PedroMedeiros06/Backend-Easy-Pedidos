// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // <-- Importe aqui
import { SupabaseModule } from './supabase/supabase.module';

import { CompanyModule } from '@/restaurante/company.module'
import { AuthModule } from './auth/auth.module';
import { FuncionariosModule } from './funcionarios/funcionarios.module';
import { IntegracoesModule } from './integracoes/integracoes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // <-- Adicione isso como o PRIMEIRO item!
    SupabaseModule,

    CompanyModule,
    
    AuthModule,
    FuncionariosModule,
    IntegracoesModule,  
  ],
})
export class AppModule {}