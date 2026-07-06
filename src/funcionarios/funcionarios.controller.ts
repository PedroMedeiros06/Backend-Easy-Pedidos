import { Controller, Get, Post, Put, Patch, Param, Body, ParseIntPipe, Query } from '@nestjs/common';
import { FuncionariosService } from './funcionarios.service';
import { CriarFuncionarioDto, AtualizarFuncionarioDto, AlternarStatusFuncionarioDto, ListarFuncionarios } from './dto/funcionarios.dto';

@Controller('funcionarios')
export class FuncionariosController {
  constructor(private readonly funcionariosService: FuncionariosService) {}

  @Get()
  async listar(@Query() query: ListarFuncionarios) {
    return this.funcionariosService.listar(query);
  }

  @Post()
  async criar(@Body() body: CriarFuncionarioDto) {
    return this.funcionariosService.criar(body);
  }

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
    @Body() body: AlternarStatusFuncionarioDto,
  ) {
    return this.funcionariosService.alternarStatus(id, body);
  }
}