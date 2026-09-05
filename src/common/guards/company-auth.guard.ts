import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { SupabaseService } from '@/supabase/supabase.service';

@Injectable()
export class CompanyAuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException('Token não informado.');
    }

    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token inválido.');
    }

    const {
      data: { user },
      error,
    } = await this.supabase.authClient.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }

    const userClient = this.supabase.createUserClient(token);

    const { data: member, error: memberError } = await userClient
      .from('members')
      .select(
        `
        member_id,
        company_id,
        member_email,
        member_active,
        member_access,
        member_permissions,
        companies(company_code)
      `,
      )
      .eq('auth_id', user.id)
      .single();

    if (memberError || !member) {
      throw new UnauthorizedException('Membro não encontrado.');
    }

    if (!member.member_active) {
      throw new UnauthorizedException('Membro inativo.');
    }

    request.user = {
      kind: 'company',
      authId: user.id,
      memberId: member.member_id,
      companyId: member.company_id,
      companyCode: (member as any).companies?.company_code,
      email: member.member_email,
      memberAccess: member.member_access,
      permissions: member.member_permissions ?? {},
    };

    return true;
  }
}
