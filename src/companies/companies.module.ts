import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { AdminMembersController } from './admin-members.controller';
import { MembersModule } from '@/members/members.module';

@Module({
  imports: [MembersModule],
  controllers: [CompaniesController, AdminMembersController],
  providers: [CompaniesService],
})
export class CompaniesModule {}
