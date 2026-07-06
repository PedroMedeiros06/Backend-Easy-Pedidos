// src/funcionarios/funcionarios.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { CriarFuncionarioDto } from './dto/criar-funcionario.dto';
import { AtualizarFuncionarioDto } from './dto/atualizar-funcionario.dto';
import { AlternarStatusDto } from './dto/atualizar-funcionario.dto';

@Injectable()
export class FuncionariosService {
  constructor(private readonly supabase: SupabaseService) {}

  // 1️⃣ LISTAR FUNCIONÁRIOS COM JOIN NO RESTAURANTE
  async listar() {
    const { data, error } = await this.supabase.client
      .from('Funcionario')
      .select(`*, restaurante:restauranteId (nome)`)
      .neq("restauranteId", 0)
      .order('nome', { ascending: true });

    if (error) throw new BadRequestException(`Erro ao listar funcionários: ${error.message}`);

    // Mapeia o resultado para "achatar" o objeto do restaurante, entregando a propriedade 'restauranteNome' mastigada para o Frontend
    return data.map((func: any) => ({
      ...func,
      restauranteNome: func.restaurante?.nome || 'Não vinculado',
    }));
  }

  // 2️⃣ CRIAR NOVO FUNCIONÁRIO
  async criar(dados: CriarFuncionarioDto) {
    const { data, error } = await this.supabase.client
      .from('Funcionario')
      .insert([dados])
      .select();

    if (error) throw new BadRequestException(`Erro ao criar colaborador: ${error.message}`);
    return data[0];
  }

  // 3️⃣ ATUALIZAR DADOS DO FUNCIONÁRIO
  async atualizar(id: number, dados: AtualizarFuncionarioDto) {
    const { senha, permissoes, ...restoDosDados } = dados;

    // Remove campos nulos/undefined vindos do partial DTO para evitar quebras no Supabase
    const dadosParaAtualizar: any = { ...restoDosDados };

    // 🔒 Só atualiza a senha se ela foi de fato preenchida
    if (senha && senha.trim() !== '') {
      // Se você for usar bcrypt futuramente, o hash entra aqui:
      // dadosParaAtualizar.senha = await bcrypt.hash(senha, 10);
      dadosParaAtualizar.senha = senha; 
    }

    // 🛡️ Garante a estrutura correta do JSONB de permissões
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
  async alternarStatus(id: number, dados: AlternarStatusDto) {
    const { statusAtual, motivo } = dados;
    
    const novoStatusBloqueio = !statusAtual; // Inverte o estado booleano vindo da tabela
    const dadosStatus = {
      bloqueado: novoStatusBloqueio,
      motivoBloqueio: novoStatusBloqueio ? motivo : null, // Limpa a string de justificativa caso esteja desbloqueando
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