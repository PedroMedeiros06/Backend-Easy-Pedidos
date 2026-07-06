// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // <-- Importe aqui
import { SupabaseModule } from './supabase/supabase.module';
import { RestauranteModule } from './restaurante/restaurante.module';
import { AuthModule } from './auth/auth.module';
import { FuncionariosModule } from './funcionarios/funcionarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // <-- Adicione isso como o PRIMEIRO item!
    SupabaseModule,
    RestauranteModule,
    AuthModule,
    FuncionariosModule,
  ],
})
export class AppModule {}