import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Registered globally: every route needs a valid token unless marked @Public().
 * Public routes still read a token when one is sent, so `@CurrentUser()` is set for
 * signed in shoppers (e.g. checkout) and `null` for guests. A bad token never blocks them.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private readonly reflector: Reflector) {
        super();
    }

    private isPublic(context: ExecutionContext) {
        return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
    }

    handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
        if (this.isPublic(context)) return user || null;
        return super.handleRequest(err, user, info, context);
    }
}
