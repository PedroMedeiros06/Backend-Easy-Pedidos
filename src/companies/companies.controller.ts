import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CompaniesService } from './companies.service';
import {
  CreateCompanyDto,
  ListCompaniesQueryDto,
  UpdateCompanyDto,
  UpdateCompanyStatusDto,
} from './dto/company.dto';
import { AdminAuthGuard } from '@/common/guards/admin-auth.guard';

@Controller('companies')
@UseGuards(AdminAuthGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  list(@Query() query: ListCompaniesQueryDto) {
    return this.companiesService.list(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.companiesService.findById(id);
  }

  @Post()
  create(@Body() payload: CreateCompanyDto) {
    return this.companiesService.create(payload);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateCompanyDto,
  ) {
    return this.companiesService.update(id, payload);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateCompanyStatusDto,
  ) {
    return this.companiesService.updateStatus(id, payload);
  }
}
