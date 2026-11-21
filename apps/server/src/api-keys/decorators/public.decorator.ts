import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** A route reachable without an API key (health only). */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC, true);
