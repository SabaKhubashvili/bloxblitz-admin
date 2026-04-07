import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { StaffPrincipal } from '../../auth/presentation/staff-principal';

export const CurrentStaff = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): StaffPrincipal => {
    const request = ctx.switchToHttp().getRequest<{ user: StaffPrincipal }>();
    return request.user;
  },
);
