import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

type UserRole = 'admin' | 'pmo' | 'dev';

const rolePermissions: Record<UserRole, string[]> = {
  admin: ['*'],
  pmo: [
    'hardware.view',
    'hardware.create',
    'hardware.assign',
    'tools.view',
    'tools.create',
    'tools.edit',
    'tools.link',
    'accounts.view',
    'employees.view',
    'employees.create',
    'employees.edit',
    'employees.offboard',
    'subscriptions.view',
    'subscriptions.create',
    'subscriptions.edit',
    'projects.view',
    'projects.create',
    'projects.edit',
    'projects.manage_members',
    'vault.view',
    'vault.reveal_passwords',
    'dashboard.view',
    'dashboard.activity',
    'guide.view',
  ],
  dev: [
    'hardware.view',
    'tools.view',
    'accounts.view',
    'employees.view',
    'subscriptions.view',
    'projects.view',
    'dashboard.view',
    'guide.view',
    'vault.reveal_passwords',
  ],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (!requiredPermissions.length) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { role?: UserRole } }>();
    const role = request.user?.role;
    if (!role) {
      // JwtAuthGuard (registered earlier) would have rejected unauthenticated
      // access. If role is still missing here, the token lacks role info.
      throw new ForbiddenException('Missing role');
    }
    const granted = rolePermissions[role] ?? [];
    const hasWildcard = granted.includes('*');
    const allowed = requiredPermissions.every(
      (permission) => hasWildcard || granted.includes(permission),
    );
    if (!allowed) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
