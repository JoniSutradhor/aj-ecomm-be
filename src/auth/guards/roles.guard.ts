import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/user-role.enum';

/** Registered globally, runs after JwtAuthGuard. Routes without @Roles() are open to any signed in user. */
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext) {
        const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()]
        );
        if (!roles?.length) return true;
        const { user } = context.switchToHttp().getRequest();
        return !!user && roles.includes(user.role);
    }
}
