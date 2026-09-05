import { Controller, Get, Param } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('cep/:cep')
  async findCep(@Param('cep') cep: string) {
    return this.integrationsService.findCep(cep);
  }

  @Get('cnpj/:cnpj')
  async findCnpj(@Param('cnpj') cnpj: string) {
    return this.integrationsService.findCnpj(cnpj);
  }
}
