import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@/supabase/supabase.service';
import {
  CreateMemberDto,
  ListMembersQueryDto,
  UpdateMemberDto,
  UpdateMemberStatusDto,
} from './dto/members.dto';

@Injectable()
export class MembersService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(companyId: number, query: ListMembersQueryDto) {
    const { data, error } = await this.supabase.adminClient
      .from('members')
      .select(
        'member_id, member_name, member_cpf, member_email, member_access, member_active, member_permissions',
      )
      .eq('company_id', companyId)
      .order('member_name', { ascending: true })
      .limit(query.limit ?? 10);

    if (error) {
      throw new BadRequestException(`Erro ao listar membros: ${error.message}`);
    }

    return data ?? [];
  }

  async create(companyId: number, payload: CreateMemberDto) {
    const { data: company, error: planError } = await this.supabase.adminClient
      .from('companies')
      .select('plan_id, plans(max_members)')
      .eq('company_id', companyId)
      .single();

    if (planError || !company) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }

    const maxMembers = (company as any).plans?.max_members ?? 0;

    const { count, error: countError } = await this.supabase.adminClient
      .from('members')
      .select('member_id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (countError) {
      throw new BadRequestException(
        `Erro ao validar limite do plano: ${countError.message}`,
      );
    }

    if (maxMembers && (count ?? 0) >= maxMembers) {
      throw new BadRequestException(
        `O plano atual permite no máximo ${maxMembers} membro(s). Faça upgrade para adicionar mais.`,
      );
    }

    const { data: authData, error: authError } =
      await this.supabase.adminClient.auth.admin.createUser({
        email: payload.memberEmail,
        password: payload.memberPassword,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      throw new BadRequestException(
        `Erro ao criar usuário de acesso: ${authError?.message}`,
      );
    }

    const { data: member, error: memberError } = await this.supabase.adminClient
      .from('members')
      .insert({
        auth_id: authData.user.id,
        company_id: companyId,
        member_name: payload.memberName,
        member_cpf: payload.memberCpf,
        member_email: payload.memberEmail,
        member_access: payload.memberAccess ?? 'employee',
        member_permissions: payload.memberPermissions ?? {},
      })
      .select()
      .single();

    if (memberError) {
      await this.supabase.adminClient.auth.admin.deleteUser(authData.user.id);
      throw new BadRequestException(
        `Erro ao criar membro: ${memberError.message}`,
      );
    }

    return member;
  }

  async update(companyId: number, memberId: string, payload: UpdateMemberDto) {
    const updatePayload: Record<string, unknown> = {
      member_name: payload.memberName,
      member_cpf: payload.memberCpf,
      member_email: payload.memberEmail,
      member_access: payload.memberAccess,
      member_permissions: payload.memberPermissions,
      updated_at: new Date().toISOString(),
    };

    Object.keys(updatePayload).forEach((key) => {
      if (updatePayload[key] === undefined) {
        delete updatePayload[key];
      }
    });

    const { data: existing, error: existingError } =
      await this.supabase.adminClient
        .from('members')
        .select('auth_id')
        .eq('member_id', memberId)
        .eq('company_id', companyId)
        .maybeSingle();

    if (existingError || !existing) {
      throw new NotFoundException('Membro não encontrado.');
    }

    if (payload.memberPassword) {
      const { error: passwordError } =
        await this.supabase.adminClient.auth.admin.updateUserById(
          existing.auth_id,
          { password: payload.memberPassword },
        );

      if (passwordError) {
        throw new BadRequestException(
          `Erro ao atualizar senha: ${passwordError.message}`,
        );
      }
    }

    if (Object.keys(updatePayload).length === 1) {
      // só updated_at, nenhum outro campo pra alterar na tabela.
      const { data } = await this.supabase.adminClient
        .from('members')
        .select(
          'member_id, member_name, member_cpf, member_email, member_access, member_active, member_permissions',
        )
        .eq('member_id', memberId)
        .single();

      return data;
    }

    const { data, error } = await this.supabase.adminClient
      .from('members')
      .update(updatePayload)
      .eq('member_id', memberId)
      .eq('company_id', companyId)
      .select()
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Erro ao atualizar membro: ${error.message}`,
      );
    }
    if (!data) {
      throw new NotFoundException('Membro não encontrado.');
    }

    return data;
  }

  async updateStatus(
    companyId: number,
    memberId: string,
    payload: UpdateMemberStatusDto,
  ) {
    const { data, error } = await this.supabase.adminClient
      .from('members')
      .update({
        member_active: payload.active,
        updated_at: new Date().toISOString(),
      })
      .eq('member_id', memberId)
      .eq('company_id', companyId)
      .select()
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Erro ao alterar status do membro: ${error.message}`,
      );
    }
    if (!data) {
      throw new NotFoundException('Membro não encontrado.');
    }

    return data;
  }
}
