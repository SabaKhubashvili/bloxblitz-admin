import type { StaffCredential } from './staff-credential';

export type StaffProfile = Pick<StaffCredential, 'id' | 'email' | 'role' | 'username'>;

export interface IStaffAuthRepository {
  findCredentialByEmail(email: string): Promise<StaffCredential | null>;
  findStaffProfileById(id: string): Promise<StaffProfile | null>;
}
