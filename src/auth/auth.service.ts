import { Injectable, UnauthorizedException } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';
import { AuthParms } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseService) {}

  async login(payload: AuthParms) {
    const { company_code, member_cpf, member_password } = payload;

    /**
     * Antes da autenticação não temos JWT.
     *
     * Por isso usamos uma RPC pública extremamente
     * específica para descobrir o email do membro.
     */
    const { data: memberEmail, error: memberError } =
      await this.supabase.authClient.rpc('get_login_email', {
        p_company_code: company_code,
        p_member_cpf: member_cpf,
      });

    if (memberError) {
      console.error('Erro ao buscar email de login:', memberError);

      throw new UnauthorizedException('Credenciais inválidas.');
    }

    if (!memberEmail) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    /**
     * Agora sim autenticamos no Supabase Auth.
     */
    const { data: authData, error: authError } =
      await this.supabase.authClient.auth.signInWithPassword({
        email: memberEmail,
        password: member_password,
      });

    if (authError || !authData.user || !authData.session) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    /**
     * Depois do login temos o JWT.
     *
     * A partir daqui podemos criar um cliente
     * autenticado e sujeito às RLS policies.
     */
    const userClient = this.supabase.createUserClient(
      authData.session.access_token,
    );

    const { data: member, error: memberLookupError } = await userClient
      .from('members')
      .select(
        `
        member_id,
        company_id,
        member_name,
        member_cpf,
        member_email,
        member_access,
        member_active,
        member_permissions
      `,
      )
      .eq('auth_id', authData.user.id)
      .single();

    if (memberLookupError || !member || !member.member_active) {
      throw new UnauthorizedException('Usuário não possui um membro válido.');
    }

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },

      session: {
        access_token: authData.session.access_token,

        refresh_token: authData.session.refresh_token,

        expires_at: authData.session.expires_at,

        expires_in: authData.session.expires_in,
      },

      member: {
        member_id: member.member_id,
        company_id: member.company_id,
        member_name: member.member_name,
        member_access: member.member_access,
      },

      permissions: member.member_permissions ?? {},
    };
  }
}
