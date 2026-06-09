import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GlobalApiAuthGuard } from './global-api-auth.guard';
import { IS_PUBLIC_ROUTE_KEY } from './public.decorator';

describe('GlobalApiAuthGuard', () => {
  const env = process.env;
  let guard: GlobalApiAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    process.env = { ...env };
    process.env.NODE_ENV = 'production';
    process.env.X_SECRET = 'prod-secret';
    delete process.env.REST_API_REQUIRE_X_SECRET;
    reflector = new Reflector();
    guard = new GlobalApiAuthGuard(reflector);
  });

  afterAll(() => {
    process.env = env;
  });

  function mockContext(headers: Record<string, string> = {}): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  }

  it('allows public routes without x-secret', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    expect(guard.canActivate(mockContext())).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      IS_PUBLIC_ROUTE_KEY,
      expect.any(Array),
    );
  });

  it('allows protected routes with a valid x-secret', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    expect(
      guard.canActivate(mockContext({ 'x-secret': 'prod-secret' })),
    ).toBe(true);
  });

  it('blocks protected routes without x-secret', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    expect(() => guard.canActivate(mockContext())).toThrow(
      UnauthorizedException,
    );
  });

  it('skips auth when REST_API_REQUIRE_X_SECRET=false', () => {
    process.env.REST_API_REQUIRE_X_SECRET = 'false';
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    expect(guard.canActivate(mockContext())).toBe(true);
  });
});
