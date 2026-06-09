import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { assertValidXSecret } from './api-auth.util';

@Injectable()
export class InternalCallGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    assertValidXSecret(request.headers['x-secret']);
    return true;
  }
}
