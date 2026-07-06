import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { CriarFuncionarioDto, AtualizarFuncionarioDto, AlternarStatusFuncionarioDto, ListarFuncionarios, PermissoesDto } from './dto/funcionarios.dto';

@Injectable()
export class FuncionariosService {
  constructor(private readonly supabase: SupabaseService) {}

  // 1️⃣ LISTAR FUNCIONÁRIOS
  async listar(filters: ListarFuncionarios) {
    const { data, error } = await this.supabase.client
      .from('Funcionario')
      .select(`*, restaurante:restauranteId (nome)`)
      .neq("restauranteId", 0)
      .order('nome', { ascending: true })
      .limit(filters.limite || 10);

    if (error) throw new BadRequestException(`Erro ao listar funcionários: ${error.message}`);

    return data.map((func: any) => ({
      ...func,
      restauranteNome: func.restaurante?.nome || 'Não vinculado',
    }));
  }

  // 2️⃣ CRIAR NOVO FUNCIONÁRIO
  async criar(dados: CriarFuncionarioDto) {
    // 🛡️ Mapeia e garante a estrutura das permissões padrão logo na criação
    const permissoesPadrao = {
      isOwner: dados.permissoes?.isOwner ?? false,
      verFinanceiro: dados.permissoes?.isOwner ? true : (dados.permissoes?.verFinanceiro ?? false),
      gerenciarProdutos: dados.permissoes?.isOwner ? true : (dados.permissoes?.gerenciarProdutos ?? false),
      caixaPedidos: dados.permissoes?.isOwner ? true : (dados.permissoes?.caixaPedidos ?? false),
    };

    const payload = {
      ...dados,
      permissoes: permissoesPadrao
    };

    const { data, error } = await this.supabase.client
      .from('Funcionario')
      .insert([payload])
      .select();

    if (error) throw new BadRequestException(`Erro ao criar colaborador: ${error.message}`);
    return data[0];
  }

  // 3️⃣ ATUALIZAR DADOS
  async atualizar(id: number, dados: AtualizarFuncionarioDto) {
    const { senhaHash, permissoes, ...restoDosDados } = dados;
    const dadosParaAtualizar: any = { ...restoDosDados };

    if (senhaHash && senhaHash.trim() !== '') {
      dadosParaAtualizar.senha = senhaHash; 
    }

    if (permissoes) {
      dadosParaAtualizar.permissoes = {
        isOwner: permissoes.isOwner ?? false,
        verFinanceiro: permissoes.isOwner ? true : (permissoes.verFinanceiro ?? false),
        gerenciarProdutos: permissoes.isOwner ? true : (permissoes.gerenciarProdutos ?? false),
        caixaPedidos: permissoes.isOwner ? true : (permissoes.caixaPedidos ?? false),
      };
    }

    const { data, error } = await this.supabase.client
      .from('Funcionario')
      .update(dadosParaAtualizar)
      .eq('id', id)
      .select();

    if (error) throw new BadRequestException(`Erro ao atualizar funcionário: ${error.message}`);
    if (!data || data.length === 0) throw new NotFoundException('Funcionário não encontrado.');

    return data[0];
  }

  // 4️⃣ BLOQUEAR / ATIVAR ACESSO
  async alternarStatus(id: number, dados: AlternarStatusFuncionarioDto) {
    const { ativo, motivo } = dados;
    
    // Se ativo for FALSE, significa que o usuário deve ser BLOQUEADO (bloqueado = true)
    const deveBloquear = !ativo; 

    const dadosStatus = {
      bloqueado: deveBloquear,
      motivo_bloqueio: deveBloquear ? (motivo || 'Motivo não informado') : null, 
    };

    const { data, error } = await this.supabase.client
      .from('Funcionario')
      .update(dadosStatus)
      .eq('id', id)
      .select();

    if (error) throw new BadRequestException(`Erro ao alterar status: ${error.message}`);
    if (!data || data.length === 0) throw new NotFoundException('Funcionário não encontrado.');

    return data[0];
  }
}