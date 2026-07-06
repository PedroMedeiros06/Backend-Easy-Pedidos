import { Controller, Get, Post, Patch, Put, Body, Param, ParseIntPipe, Delete } from '@nestjs/common';
import { RestauranteService } from './restaurante.service';
import { criarRestauranteDto } from './dto/criar-restaurante.dto';
import { AlternarStatusRestauranteDto, AtualizarRestauranteDto } from './dto/atualizar-restaurante.dto';

@Controller('restaurantes')
export class RestauranteController {
  constructor(private readonly restauranteService: RestauranteService) {}

  @Post()
  async criar(@Body() createRestauranteDto: criarRestauranteDto) {
    return this.restauranteService.criar(createRestauranteDto);
  }

  @Get()
  async listar() {
    return this.restauranteService.listar();
  }


  @Patch(':id/status')
  async alterarStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() alternarStatusDto: AlternarStatusRestauranteDto, // 🌟 Agora recebe o DTO completo (ativo e motivo)
  ) {
    // Repassa o ID e o DTO completo para o Service
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