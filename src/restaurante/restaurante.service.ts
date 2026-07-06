import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { criarRestauranteDto } from './dto/criar-restaurante.dto';
import { AtualizarRestauranteDto, AlternarStatusRestauranteDto } from './dto/atualizar-restaurante.dto';

@Injectable()
export class RestauranteService {
  constructor(private readonly supabase: SupabaseService) {}

  // 1️⃣ LISTAR RESTAURANTES (Trazendo os dados mapeados idênticos ao que a tabela espera)
  async listar() {
    const { data, error } = await this.supabase.client
      .from('Restaurante')
      .select('*, funcionarios:Funcionario(*)')
      .neq('id', 0)
      .order('nome', { ascending: true });

    if (error) throw new BadRequestException(`Erro ao listar estabelecimentos: ${error.message}`);
    if (!data) return [];

    // Mapeia para entregar as chaves que o React usa (.codigo, .criadoEm, .nomeDono, .bloqueado)
    return data.map((restaurante) => {
      const dono = restaurante.funcionarios?.find(
        (f: any) => f.permissoes?.isOwner === true
      );

      return {
        id: restaurante.id,
        nome: restaurante.nome,
        cnpj: restaurante.cnpj,
        email: restaurante.email,
        whatsapp: restaurante.whatsapp || '',
        codigo: restaurante.codigoRestaurante,
        criadoEm: restaurante.criadoEm,
        bloqueado: restaurante.bloqueado,
        motivo_bloqueio: restaurante.motivo_bloqueio,
        nomeDono: dono ? dono.nome : 'Não informado',
      };
    });
  }

  // 2️⃣ CADASTRAR RESTAURANTE + DONO MASTER (Sua regra de negócio original recuperada!)
  async criar(dados: criarRestauranteDto) {
    // A. Verifica se o CPF do dono já existe
    const { data: cpfExistente } = await this.supabase.client
      .from('Funcionario')
      .select('id')
      .eq('cpf', dados.cpf)
      .maybeSingle();

    if (cpfExistente) {
      throw new BadRequestException('Já existe um funcionário cadastrado com este CPF.');
    }

    // B. Insere o restaurante com código provisório para capturar o ID sequencial
    const { data: restaurante, error: errorRestaurante } = await this.supabase.client
      .from('Restaurante')
      .insert({
        codigoRestaurante: 'TEMP',
        nome: dados.nome,
        cnpj: dados.cnpj,
        email: dados.email,
        whatsapp: dados.whatsapp,
        bloqueado: false
      })
      .select()
      .single();

    if (errorRestaurante) throw new BadRequestException(errorRestaurante.message);

    // C. Define as permissões Master do Proprietário
    const permissoesDono = {
      canCheckStocks: false,
      canSeeFinancialReports: false,
      canDoOrders: false,
      canSeeOrders: false,
      canChangeOrderState: false,
      canCancelOrder: false,
      isOwner: true, // 🌟 Libera tudo e funcionalidades futuras
    };

    // D. Cria o funcionário Dono vinculado a esse restaurante
    const { error: errorFuncionario } = await this.supabase.client
      .from('Funcionario')
      .insert({
        nome: dados.nomeDono,
        cpf: dados.cpf,
        senhaHash: dados.senha,
        restauranteId: restaurante.id,
        permissoes: permissoesDono
      });

    if (errorFuncionario) throw new BadRequestException(errorFuncionario.message);

    const codigoDefinitivo = `R-${1000 + restaurante.id}`;
    
    const { data: restauranteAtualizado, error: errorAtualizacao } = await this.supabase.client
      .from('Restaurante')
      .update({ codigoRestaurante: codigoDefinitivo })
      .eq('id', restaurante.id)
      .select()
      .single();

    if (errorAtualizacao) throw new BadRequestException(errorAtualizacao.message);

    return {
      mensagem: 'Estabelecimento e Dono Mestre cadastrados com sucesso!',
      codigoParaLogin: codigoDefinitivo,
      restaurante: restauranteAtualizado,
    };
  }

  // 3️⃣ ATUALIZAR DADOS DO RESTAURANTE
  async atualizar(id: number, dados: AtualizarRestauranteDto) {
    const { data, error } = await this.supabase.client
      .from('Restaurante')
      .update(dados)
      .eq('id', id)
      .select();

    if (error) throw new BadRequestException(`Erro ao atualizar estabelecimento: ${error.message}`);
    if (!data || data.length === 0) throw new NotFoundException('Restaurante não encontrado.');

    return data[0];
  }

  // 4️⃣ ALTERAR STATUS (Invertendo para salvar na coluna 'bloqueado' usada pelo painel)
  async alternarStatus(id: number, dados: AlternarStatusRestauranteDto) {
    const isBloqueado = !dados.ativo;

    const { data, error } = await this.supabase.client
      .from('Restaurante')
      .update({ 
        bloqueado: isBloqueado,
        motivo_bloqueio: isBloqueado ? (dados.motivo || null) : null 
      })
      .eq('id', id)
      .select();

    if (error) throw new BadRequestException(`Erro ao alterar status da loja: ${error.message}`);
    if (!data || data.length === 0) throw new NotFoundException('Restaurante não encontrado.');

    return {
      mensagem: 'Status alterado com sucesso!',
      bloqueado: data[0].bloqueado,
      motivoBloqueio: data[0].motivoBloqueio, // Retorna para o front confirmar
    };
  }

  async deletar(id: number) {
    // A. Opcional: Remove primeiro os funcionários vinculados para evitar travas de chave estrangeira
    const { error: errorFuncionarios } = await this.supabase.client
      .from('Funcionario')
      .delete()
      .eq('restauranteId', id);

    if (errorFuncionarios) {
      throw new BadRequestException(`Erro ao remover funcionários vinculados: ${errorFuncionarios.message}`);
    }

    // B. Remove o restaurante
    const { data, error } = await this.supabase.client
      .from('Restaurante')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw new BadRequestException(`Erro ao excluir restaurante: ${error.message}`);
    if (!data || data.length === 0) throw new NotFoundException('Restaurante não encontrado.');

    return {
      mensagem: 'Restaurante e funcionários removidos com sucesso!',
    };
  }
}