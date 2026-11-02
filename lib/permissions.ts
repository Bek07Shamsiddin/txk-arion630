import type { UserRole } from './auth';
import { t } from './i18n/uz';

/** User (active) ham, eski UserProfile (is_active) ham qabul qilinadi. */
type UserProfile = { role: UserRole; active?: boolean; is_active?: boolean };
const isActive = (p: UserProfile) => (p.active ?? p.is_active) === true;

export const Permissions = {
  canAddTractor: (profile: UserProfile | null): boolean => {
    return profile?.role === 'admin' || profile?.role === 'operator';
  },

  canEditTractor: (profile: UserProfile | null): boolean => {
    return profile?.role === 'admin';
  },

  canDeleteTractor: (profile: UserProfile | null): boolean => {
    return profile?.role === 'admin';
  },

  canLogMotoHours: (profile: UserProfile | null): boolean => {
    return profile?.role === 'operator' || profile?.role === 'admin';
  },

  canAddServiceRecord: (profile: UserProfile | null): boolean => {
    return profile?.role === 'technician' || profile?.role === 'admin';
  },

  canViewServiceHistory: (profile: UserProfile | null): boolean => {
    return !!profile && isActive(profile);
  },

  canRequestParts: (profile: UserProfile | null): boolean => {
    return profile?.role === 'operator' || profile?.role === 'technician' || profile?.role === 'admin';
  },

  canManageParts: (profile: UserProfile | null): boolean => {
    return profile?.role === 'admin';
  },

  canRequestMechanic: (profile: UserProfile | null): boolean => {
    return profile?.role === 'operator' || profile?.role === 'admin';
  },

  canManageMechanicRequests: (profile: UserProfile | null): boolean => {
    return profile?.role === 'technician' || profile?.role === 'admin';
  },

  canReportDamage: (profile: UserProfile | null): boolean => {
    return profile?.role === 'operator' || profile?.role === 'admin';
  },

  canViewReports: (profile: UserProfile | null): boolean => {
    return profile?.role === 'admin' || profile?.role === 'technician';
  },

  canManageUsers: (profile: UserProfile | null): boolean => {
    return profile?.role === 'admin';
  },

  isAdmin: (profile: UserProfile | null): boolean => {
    return profile?.role === 'admin' && isActive(profile);
  },

  isTechnician: (profile: UserProfile | null): boolean => {
    return profile?.role === 'technician' && isActive(profile);
  },

  isOperator: (profile: UserProfile | null): boolean => {
    return profile?.role === 'operator' && isActive(profile);
  },
};

export function getRoleName(role: UserRole): string {
  return t.roles[role];
}

export function getRoleColor(role: UserRole): string {
  const roleColors: Record<UserRole, string> = {
    operator: '#3b82f6',
    technician: '#f59e0b',
    admin: '#ef4444',
  };
  return roleColors[role];
}
