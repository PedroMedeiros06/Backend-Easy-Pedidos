import { Module } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { SupabaseService } from '../supabase/supabase.service';

@Module({
  controllers: [AdminAuthController],
  providers: [AdminAuthService, SupabaseService],
})
export class AdminAuthModule {}
