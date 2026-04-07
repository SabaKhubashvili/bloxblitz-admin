/** Staff identity used for authentication (no framework imports). */
export interface StaffCredential {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  username: string;
}
