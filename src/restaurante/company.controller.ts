import { Controller, Get, Post, Patch, Put, Body, Param, ParseIntPipe, Delete, Query } from '@nestjs/common';
import { CriarRestauranteDto, AtualizarRestauranteDto, AlternarStatusRestauranteDto, ListarRestaurantesDto } from './dto/company.dto';
import { CompanyService } from './company.service';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  async criar(@Body() createRestauranteDto: CriarRestauranteDto) {
    return this.companyService.create(createRestauranteDto);
  }

  @Get()
  async listar(@Query() query: ListarRestaurantesDto) {
    return this.companyService.list(query);
  }


  // @Patch(':id/status')
  // async alterarStatus(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body() alternarStatusDto: AlternarStatusRestauranteDto, // 🌟 Agora recebe o DTO completo (ativo e motivo)
  // ) {
  //   return this.companyService.alternarStatus(id, alternarStatusDto);
  // }

  // @Put(':id')
  // async atualizar(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body() updateRestauranteDto: AtualizarRestauranteDto,
  // ) {
  //   console.log(updateRestauranteDto)
  //   return this.companyService.atualizar(id, updateRestauranteDto);
  // }

  // @Delete(':id')
  // async deletar(@Param('id', ParseIntPipe) id: number) {
  //   return this.companyService.deletar(id);
  // }
}