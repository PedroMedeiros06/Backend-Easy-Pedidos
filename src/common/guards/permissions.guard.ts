import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

import { Permission } from '../permissions/permissions';

import { CurrentUser } from '../types/current-user';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Endpoint não exige permissão específica.
    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const user: CurrentUser = request.user;

    if (!user || user.kind !== 'company') {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    // Owner tem acesso irrestrito, sem depender de
    // permissões individuais configuradas em member_permissions.
    if (user.memberAccess === 'owner') {
      return true;
    }

    const userPermissions = user.permissions ?? {};

    const hasAllPermissions = requiredPermissions.every(
      (permission) => userPermissions[permission] === true,
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        'Você não possui permissão para realizar esta ação.',
      );
    }

    return true;
  }
}
