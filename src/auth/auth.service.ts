import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
  constructor(private supabase: SupabaseService) {}

  async validarLogin(dados: { codigoRestaurante: string; cpf: string; senha: string }) {
    const codigoLimpo = dados.codigoRestaurante.trim().toUpperCase();
    const cpfLimpo = dados.cpf.replace(/\D/g, "").trim();

    // 1. Busca o restaurante pelo código fornecido
    const { data: restaurante, error: erroRestaurante } = await this.supabase.client
      .from('Restaurante')
      .select('id, nome, bloqueado')
      .eq('codigoRestaurante', codigoLimpo)
      .single();

    if (erroRestaurante || !restaurante) {
      throw new UnauthorizedException('Estabelecimento não encontrado com este código.');
    }

    // 2. Busca o funcionário dentro do restaurante encontrado
    const { data: funcionario, error: erroFuncionario } = await this.supabase.client
      .from('Funcionario')
      .select('id, nome, cpf, senhaHash, permissoes')
      .eq('restauranteId', restaurante.id)
      .eq('cpf', cpfLimpo) 
      .single();

    if (erroFuncionario || !funcionario) {
      throw new UnauthorizedException('CPF ou senha incorretos para este estabelecimento.');
    }

    // 3. Validação da Senha
    if (funcionario.senhaHash !== dados.senha) {
      throw new UnauthorizedException('CPF ou senha incorretos para este estabelecimento.');
    }

    // ✨ VERIFICAÇÃO DE PERMISSÃO: Se NÃO for super_admin, aplica a regra de bloqueio da loja
    const ehSuperAdmin = funcionario.permissoes === 'super_admin';
    
    if (!ehSuperAdmin && restaurante.bloqueado) {
      throw new UnauthorizedException('O acesso deste estabelecimento foi suspenso pelo administrador.');
    }

    this.registrarUltimoAcesso(funcionario.id)

    // 4. Retorna os dados necessários para o frontend decidir a rota
    return {
      mensagem: 'Login efetuado com sucesso!',
      token: `token_ficticio_jwt_${funcionario.id}`, // Substitua pelo seu JWT real se houver
      usuario: {
        id: funcionario.id,
        nome: funcionario.nome,
        permissao: funcionario.permissoes, // 'super_admin', 'gerente', etc.
        restauranteId: restaurante.id,
        restauranteNome: restaurante.nome
      }
    };
  }

  async registrarUltimoAcesso(funcionarioId: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('Funcionario')
      .update({ ultimo_login: new Date().toISOString() }) // Salva no formato ISO aceito pelo Postgres
      .eq('id', funcionarioId);

    if (error) {
      // Apenas faz um log para não travar o login do usuário se a gravação do histórico falhar
      console.error(`Falha ao registrar último login do funcionário ${funcionarioId}:`, error.message);
    }
  }
}