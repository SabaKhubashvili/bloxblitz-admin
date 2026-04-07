import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { StaffPrincipal } from '../../auth/presentation/staff-principal';

@Injectable()
export class AdminAuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    staff: StaffPrincipal;
    action: string;
    targetUsername?: string;
    targetUserId?: string;
    payload?: unknown;
  }): Promise<void> {
    await this.prisma.adminAuditLog.create({
      data: {
        staffId: input.staff.staffId,
        staffEmail: input.staff.email.slice(0, 320),
        action: input.action.slice(0, 80),
        targetUserUsername: input.targetUsername?.slice(0, 255) ?? null,
        targetUserId: input.targetUserId?.slice(0, 64) ?? null,
        payload:
          input.payload === undefined
            ? undefined
            : (input.payload as Prisma.InputJsonValue),
      },
    });
  }
}
