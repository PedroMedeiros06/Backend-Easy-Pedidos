import { Controller, Get, Param } from '@nestjs/common';
import { IntegracoesService } from './integracoes.service';

@Controller('integracoes')
export class IntegracoesController {
  constructor(private readonly integracoesService: IntegracoesService) {}

  @Get('cep/:cep')
  async buscarCep(@Param('cep') cep: string) {
    return this.integracoesService.buscarCep(cep);
  }

  @Get('cnpj/:cnpj')
  async buscarCnpj(@Param('cnpj') cnpj: string) {
    return this.integracoesService.buscarCnpj(cnpj);
  }
}