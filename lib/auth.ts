// Moslik qatlami: eski ekranlar useAuth() ni o'qiydi. Yangi kod useSession() ishlatadi.
import { useSession } from './session';

export type UserRole = 'operator' | 'technician' | 'admin';

export interface UserProfile {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  profile_photo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useAuth() {
  const { user, loading, signOut, refresh } = useSession();
  const profile: UserProfile | null = user
    ? {
        id: user.id,
        name: user.name,
        role: user.role,
        is_active: user.active,
        phone: '',
        created_at: user.createdAt,
        updated_at: user.createdAt,
      }
    : null;
  return { session: user, user, profile, loading, signOut, refreshProfile: refresh };
}
