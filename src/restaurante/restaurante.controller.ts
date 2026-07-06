import { Controller, Get, Post, Patch, Put, Body, Param, ParseIntPipe, Delete, Query } from '@nestjs/common';
import { RestauranteService } from './restaurante.service';
import { CriarRestauranteDto, AtualizarRestauranteDto, AlternarStatusRestauranteDto, ListarRestaurantesDto } from './dto/restaurante.dto';

@Controller('restaurantes')
export class RestauranteController {
  constructor(private readonly restauranteService: RestauranteService) {}

  @Post()
  async criar(@Body() createRestauranteDto: CriarRestauranteDto) {
    return this.restauranteService.criar(createRestauranteDto);
  }

  @Get()
  async listar(@Query() query: ListarRestaurantesDto) {
    return this.restauranteService.listar(query);
  }


  @Patch(':id/status')
  async alterarStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() alternarStatusDto: AlternarStatusRestauranteDto, // 🌟 Agora recebe o DTO completo (ativo e motivo)
  ) {
    return this.restauranteService.alternarStatus(id, alternarStatusDto);
  }

  @Put(':id')
  async atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRestauranteDto: AtualizarRestauranteDto,
  ) {
    return this.restauranteService.atualizar(id, updateRestauranteDto);
  }

  @Delete(':id')
  async deletar(@Param('id', ParseIntPipe) id: number) {
    return this.restauranteService.deletar(id);
  }
}