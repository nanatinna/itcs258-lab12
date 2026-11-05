/*
AI Declaration:
I used Claude Code to help implement wiring the role claim through the JWT.
I wrote all the other code, and I understand the entire implementation.

Reflection:
[ I learned how to implement role-based access control in a NestJS application using JWTs. The process of extracting the role from the JWT and enforcing it through guards was particularly insightful.
 Overall, AI helped me understand the concepts and implementation details more clearly. ]
*/

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../../../generated/prisma/enums';

interface AuthenticatedRequest extends Request {
  user?: { sub: number; username: string; role: Role };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userRole = request.user?.role;

    if (!userRole || !requiredRoles.includes(userRole)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }
}
