import { Permission } from '../permissions/permissions';

export interface CompanyUser {
  kind: 'company';
  authId: string;
  memberId: string;
  companyId: number;
  companyCode: string;
  email: string;
  memberAccess: 'owner' | 'employee';

  permissions: Partial<Record<Permission, boolean>>;
}

export interface AdminUser {
  kind: 'admin';
  authId: string;
  adminId: string;
  email: string;
}

export type CurrentUser = CompanyUser | AdminUser;
