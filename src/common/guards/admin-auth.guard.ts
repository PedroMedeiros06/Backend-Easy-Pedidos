import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { SupabaseService } from '@/supabase/supabase.service';

@Injectable()
export class AdminAuthGuard implements CanActivate {
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

    const { data: admin, error: adminError } = await this.supabase.adminClient
      .from('admin_users')
      .select('admin_id, email, active')
      .eq('auth_id', user.id)
      .single();

    if (adminError || !admin) {
      throw new UnauthorizedException(
        'Usuário não é um administrador do sistema.',
      );
    }

    if (!admin.active) {
      throw new UnauthorizedException('Administrador inativo.');
    }

    request.user = {
      kind: 'admin',
      authId: user.id,
      adminId: admin.admin_id,
      email: admin.email,
    };

    return true;
  }
}
