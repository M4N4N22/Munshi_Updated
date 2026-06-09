import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { assertValidXSecret, isRestApiAuthRequired } from './api-auth.util';
import { IS_PUBLIC_ROUTE_KEY } from './public.decorator';

@Injectable()
export class GlobalApiAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (!isRestApiAuthRequired()) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    assertValidXSecret(request.headers['x-secret']);
    return true;
  }
}
