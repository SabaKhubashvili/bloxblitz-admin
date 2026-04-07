import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../roles.constants';

/** Staff JWT `role` must be one of these to access the route. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
