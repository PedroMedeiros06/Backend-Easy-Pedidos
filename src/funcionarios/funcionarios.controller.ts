import { Controller, Get, Post, Put, Patch, Param, Body, ParseIntPipe } from '@nestjs/common';
import { FuncionariosService } from './funcionarios.service';
import { CriarFuncionarioDto } from './dto/criar-funcionario.dto';
import { AtualizarFuncionarioDto } from './dto/atualizar-funcionario.dto';
import { AlternarStatusDto } from './dto/atualizar-funcionario.dto';

@Controller('funcionarios')
export class FuncionariosController {
  constructor(private readonly funcionariosService: FuncionariosService) {}

  @Get()
  async listar() {
    return this.funcionariosService.listar();
  }

  @Post()
  async criar(@Body() body: CriarFuncionarioDto) {
    return this.funcionariosService.criar(body);
  }

  // 🌟 O ParseIntPipe converte o ID da URL de String para Number automaticamente
  @Put(':id')
  async atualizar(
    @Param('id', ParseIntPipe) id: number, 
    @Body() body: AtualizarFuncionarioDto,
  ) {
    return this.funcionariosService.atualizar(id, body);
  }

  @Patch(':id/status')
  async alternarStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AlternarStatusDto,
  ) {
    return this.funcionariosService.alternarStatus(id, body);
  }
}