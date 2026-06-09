import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_ROUTE_KEY = 'isPublicRoute';

/** Skip global x-secret check (webhooks, onboarding, health, OAuth browser redirects). */
export const Public = () => SetMetadata(IS_PUBLIC_ROUTE_KEY, true);
