import { Injectable, UnauthorizedException } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';
import { AdminAuthParms } from './admin-auth.dto';

@Injectable()
export class AdminAuthService {
  constructor(private readonly supabase: SupabaseService) {}

  async login(payload: AdminAuthParms) {
    const { admin_cpf, admin_password } = payload;

    /**
     * Antes da autenticação não temos JWT.
     *
     * Por isso usamos uma RPC pública extremamente
     * específica para descobrir o email do admin.
     */
    const { data: adminEmail, error: adminEmailError } =
      await this.supabase.authClient.rpc('get_admin_login_email', {
        p_cpf: admin_cpf,
      });

    if (adminEmailError) {
      console.error('Erro ao buscar email de login do admin:', adminEmailError);

      throw new UnauthorizedException('Credenciais inválidas.');
    }

    if (!adminEmail) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const { data: authData, error: authError } =
      await this.supabase.authClient.auth.signInWithPassword({
        email: adminEmail,
        password: admin_password,
      });

    if (authError || !authData.user || !authData.session) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    /**
     * Confirma via service role que o auth_id realmente
     * corresponde a um admin ativo (não a um company user).
     */
    const { data: admin, error: adminLookupError } =
      await this.supabase.adminClient
        .from('admin_users')
        .select('admin_id, name, email, active')
        .eq('auth_id', authData.user.id)
        .single();

    if (adminLookupError || !admin || !admin.active) {
      throw new UnauthorizedException(
        'Usuário não possui acesso de administrador.',
      );
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

      admin: {
        admin_id: admin.admin_id,
        name: admin.name,
      },
    };
  }
}
