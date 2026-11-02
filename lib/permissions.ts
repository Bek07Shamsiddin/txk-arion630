import { UserRole, UserProfile } from './auth';

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
    return !!profile && profile.is_active;
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
    return profile?.role === 'admin' && profile.is_active === true;
  },

  isTechnician: (profile: UserProfile | null): boolean => {
    return profile?.role === 'technician' && profile.is_active === true;
  },

  isOperator: (profile: UserProfile | null): boolean => {
    return profile?.role === 'operator' && profile.is_active === true;
  },
};

export function getRoleName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    operator: 'Operator',
    technician: 'Technician',
    admin: 'Administrator',
  };
  return roleNames[role];
}

export function getRoleColor(role: UserRole): string {
  const roleColors: Record<UserRole, string> = {
    operator: '#3b82f6',
    technician: '#f59e0b',
    admin: '#ef4444',
  };
  return roleColors[role];
}
