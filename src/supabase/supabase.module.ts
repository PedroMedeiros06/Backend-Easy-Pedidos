// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Global() // Torna o Prisma disponível no projeto inteiro sem precisar reimportar
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}