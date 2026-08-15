import { Injectable, UnauthorizedException, NotFoundException, Session } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthParms } from './auth.dto';
import { error } from 'console';

@Injectable()
export class AuthService {
  constructor(private supabase: SupabaseService) {}

    async login(payload: AuthParms) {

      console.log(payload)
      const { data: company, error: company_error} = await this.supabase.client
      .from('companies')
      .select('company_id, company_code')
      .eq('company_code', payload.company_code)
      .single()

      if (company_error) {
        console.log(company_error)
        throw new Error('Erro ao buscar o company_id')
      }

      const { data: member, error: member_error} = await this.supabase.client
      .from('members')
      .select('member_id, company_id, member_cpf, member_email, member_access')
      .eq('company_id', company.company_id)
      .eq('member_cpf', payload.member_cpf)
      .single()

      if (member_error) {
        console.log(member_error)
        throw new Error('Erro ao buscar o membro')
      }

      const {data: userAuth, error: auth_error} = await this.supabase.authClient
      .auth.signInWithPassword({email: member.member_email, password: payload.member_password})

      if (auth_error) {
        console.log(auth_error)
        throw new Error("Erro ao autenticar o usuário")
      }

      const payback = {
        user: {
          id: userAuth.user.id,
          email: userAuth.user.email
        },
        session: {
          access_token: userAuth.session.access_token,
          refresh_token: userAuth.session.refresh_token,
          expires_at: userAuth.session.expires_at,
          expires_in: userAuth.session.expires_in,
        },
        member: {
          member_id: member.member_id,
          member_company: member.company_id,
          member_access: member.member_access
        }
      }

      return payback
    }


}