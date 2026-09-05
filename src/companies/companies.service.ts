import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '@/supabase/supabase.service';
import {
  CreateCompanyDto,
  ListCompaniesQueryDto,
  UpdateCompanyDto,
  UpdateCompanyStatusDto,
} from './dto/company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly supabase: SupabaseService) {}

  private toCompanyResponse(company: any) {
    return {
      companyId: company.company_id,
      companyCode: company.company_code,
      companyName: company.company_name,
      companyEmail: company.company_email,
      companyLegal: company.company_legal,
      companyLocation: company.company_location,
      planId: company.plan_id,
      blocked: company.blocked,
      blockReason: company.block_reason,
      createdAt: company.created_at,
      updatedAt: company.updated_at,
    };
  }

  async list(query: ListCompaniesQueryDto) {
    const { data, error } = await this.supabase.adminClient
      .from('companies')
      .select('*, members(member_id, member_name, member_access)')
      .order('company_name', { ascending: true })
      .limit(query.limit ?? 10);

    if (error) {
      throw new BadRequestException(
        `Erro ao listar estabelecimentos: ${error.message}`,
      );
    }

    return (data ?? []).map((company: any) => {
      const owner = company.members?.find(
        (member: any) => member.member_access === 'owner',
      );

      return {
        ...this.toCompanyResponse(company),
        ownerName: owner ? owner.member_name : 'Não informado',
      };
    });
  }

  async findById(companyId: number) {
    const { data, error } = await this.supabase.adminClient
      .from('companies')
      .select('*, members(member_id, member_name, member_access)')
      .eq('company_id', companyId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }

    const owner = (data as any).members?.find(
      (member: any) => member.member_access === 'owner',
    );

    return {
      ...this.toCompanyResponse(data),
      ownerName: owner ? owner.member_name : 'Não informado',
    };
  }

  async create(payload: CreateCompanyDto) {
    const { data: company, error: createError } =
      await this.supabase.adminClient
        .from('companies')
        .insert({
          company_code: 'TEMP',
          company_name: payload.companyName,
          company_email: payload.companyEmail,
          company_legal: payload.companyLegal ?? null,
          company_location: payload.companyLocation ?? null,
          plan_id: payload.planId,
        })
        .select()
        .single();

    if (createError || !company) {
      throw new BadRequestException(
        `Erro ao criar estabelecimento: ${createError?.message}`,
      );
    }

    const companyCode = `E-${1000 + company.company_id}`;

    const { data: updatedCompany, error: updateError } =
      await this.supabase.adminClient
        .from('companies')
        .update({ company_code: companyCode })
        .eq('company_id', company.company_id)
        .select()
        .single();

    if (updateError) {
      await this.supabase.adminClient
        .from('companies')
        .delete()
        .eq('company_id', company.company_id);
      throw new BadRequestException(
        `Erro ao gerar código do estabelecimento: ${updateError.message}`,
      );
    }

    const { data: authData, error: authError } =
      await this.supabase.adminClient.auth.admin.createUser({
        email: payload.companyEmail,
        password: payload.ownerPassword,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      await this.supabase.adminClient
        .from('companies')
        .delete()
        .eq('company_id', company.company_id);
      throw new BadRequestException(
        `Erro ao criar usuário de acesso do responsável: ${authError?.message}`,
      );
    }

    const { error: ownerError } = await this.supabase.adminClient
      .from('members')
      .insert({
        auth_id: authData.user.id,
        company_id: company.company_id,
        member_name: payload.ownerName,
        member_cpf: payload.ownerCpf,
        member_email: payload.companyEmail,
        member_access: 'owner',
        member_permissions: {},
      });

    if (ownerError) {
      await this.supabase.adminClient.auth.admin.deleteUser(authData.user.id);
      await this.supabase.adminClient
        .from('companies')
        .delete()
        .eq('company_id', company.company_id);
      throw new BadRequestException(
        `Erro ao criar responsável pelo estabelecimento: ${ownerError.message}`,
      );
    }

    return {
      ...this.toCompanyResponse(updatedCompany),
      ownerName: payload.ownerName,
    };
  }

  async update(companyId: number, payload: UpdateCompanyDto) {
    const { data, error } = await this.supabase.adminClient
      .from('companies')
      .update({
        company_name: payload.companyName,
        company_email: payload.companyEmail,
        company_legal: payload.companyLegal,
        company_location: payload.companyLocation,
        plan_id: payload.planId,
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', companyId)
      .select()
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Erro ao atualizar estabelecimento: ${error.message}`,
      );
    }
    if (!data) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }

    return this.toCompanyResponse(data);
  }

  async updateStatus(companyId: number, payload: UpdateCompanyStatusDto) {
    const { data, error } = await this.supabase.adminClient
      .from('companies')
      .update({
        blocked: payload.blocked,
        block_reason: payload.blocked ? (payload.reason ?? null) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', companyId)
      .select()
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Erro ao alterar status: ${error.message}`);
    }
    if (!data) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }

    return this.toCompanyResponse(data);
  }
}
