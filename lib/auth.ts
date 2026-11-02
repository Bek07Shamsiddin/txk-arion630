import { createContext, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';

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

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (phone: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (phone: string, password: string, name: string, role: UserRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
