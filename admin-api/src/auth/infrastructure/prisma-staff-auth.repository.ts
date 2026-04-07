import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { IStaffAuthRepository } from '../domain/staff-auth.repository';
import type { StaffCredential } from '../domain/staff-credential';

@Injectable()
export class PrismaStaffAuthRepository implements IStaffAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCredentialByEmail(email: string): Promise<StaffCredential | null> {
    const row = await this.prisma.staffMember.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        first_name: true,
      },
    });

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password,
      role: row.role,
      username: `${row.first_name}`,
    };
  }

  async findStaffProfileById(id: string) {
    const row = await this.prisma.staffMember.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        first_name: true,
      },
    });
    return row ? {
      id: row.id,
      email: row.email,
      role: row.role,
      username: `${row.first_name}`,
    } : null;
  }
}
