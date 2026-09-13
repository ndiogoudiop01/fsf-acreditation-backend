import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Exempte une route de l'authentification JWT globale (`JwtAuthGuard`). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
