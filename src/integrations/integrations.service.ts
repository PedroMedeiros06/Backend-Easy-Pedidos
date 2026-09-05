import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class IntegrationsService {
  // 📍 Consulta de CEP
  async findCep(cep: string) {
    const cepLimpo = cep.replace(/\D/g, '');

    if (cepLimpo.length !== 8) {
      throw new BadRequestException(
        'Formato de CEP inválido. Deve conter 8 dígitos.',
      );
    }

    try {
      const response = await fetch(
        `https://brasilapi.com.br/api/cep/v2/${cepLimpo}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new NotFoundException('CEP não encontrado.');
      }

      const data = await response.json();

      return {
        cep: data.cep,
        logradouro: data.street,
        bairro: data.neighborhood,
        cidade: data.city,
        estado: data.state,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Erro ao consultar o CEP.');
    }
  }

  // 🏢 Consulta de CNPJ (com fallback e headers de navegador)
  async findCnpj(cnpj: string) {
    const cnpjLimpo = cnpj.replace(/\D/g, '');

    if (cnpjLimpo.length !== 14) {
      throw new BadRequestException(
        'Formato de CNPJ inválido. Deve conter 14 dígitos.',
      );
    }

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json',
    };

    // 1ª Tentativa: BrasilAPI
    try {
      const response = await fetch(
        `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`,
        { headers },
      );

      if (response.ok) {
        const data = await response.json();
        return {
          cnpj: data.cnpj,
          razao_social: data.razao_social,
          nome_fantasia: data.nome_fantasia || data.razao_social,
          situacao_cadastral: data.descricao_situacao_cadastral,
          cnae_fiscal_descricao: data.cnae_fiscal_descricao,
          cep: data.cep,
          logradouro:
            `${data.descricao_tipo_de_logradouro || ''} ${data.logradouro || ''}`.trim(),
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.municipio,
          estado: data.uf,
        };
      }
    } catch (err) {
      // Avança para a alternativa se a BrasilAPI falhar
    }

    // 2ª Tentativa (Fallback): ReceitaWS
    try {
      const responseFallback = await fetch(
        `https://publica.receitaws.com.br/v1/cnpj/${cnpjLimpo}`,
        { headers },
      );

      if (responseFallback.ok) {
        const data = await responseFallback.json();

        if (data.status !== 'ERROR') {
          return {
            cnpj: data.cnpj?.replace(/\D/g, ''),
            razao_social: data.nome,
            nome_fantasia: data.fantasia || data.nome,
            situacao_cadastral: data.situacao,
            cnae_fiscal_descricao: data.atividade_principal?.[0]?.text || '',
            cep: data.cep?.replace(/\D/g, ''),
            logradouro: data.logradouro,
            numero: data.numero,
            complemento: data.complemento,
            bairro: data.bairro,
            cidade: data.municipio,
            estado: data.uf,
          };
        }
      }
    } catch (err) {
      // Se ambos falharem, lança a exceção final
    }

    throw new NotFoundException(
      'Não foi possível localizar este CNPJ no momento. Verifique o número digitado.',
    );
  }
}
