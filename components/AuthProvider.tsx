import { useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { AuthContext, UserProfile, UserRole } from '@/lib/auth';

interface AuthProviderProps {
  children: ReactNode;
}

function normalizePhoneNumber(phone: string): string {
  console.log('[NORMALIZE] Input:', phone);

  // Remove all non-digit characters
  let cleanPhone = phone.replace(/\D/g, '');
  console.log('[NORMALIZE] After removing non-digits:', cleanPhone);

  // Handle different formats:
  // 1. +998912345678 -> 998912345678
  // 2. 998912345678 -> 998912345678
  // 3. 0912345678 -> 998912345678
  // 4. 912345678 -> 998912345678

  if (cleanPhone.startsWith('998')) {
    // Already has country code
    cleanPhone = cleanPhone;
  } else if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
    // Remove leading 0 and add country code
    cleanPhone = '998' + cleanPhone.substring(1);
  } else if (cleanPhone.length === 9) {
    // Just the local number, add country code
    cleanPhone = '998' + cleanPhone;
  }

  // Add + prefix
  const normalized = '+' + cleanPhone;
  console.log('[NORMALIZE] Final normalized:', normalized);

  return normalized;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await loadUserProfile(user.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (phone: string, password: string) => {
    try {
      const normalizedPhone = normalizePhoneNumber(phone);

      console.log('=== LOGIN ATTEMPT ===');
      console.log('Input phone:', phone);
      console.log('Normalized phone:', normalizedPhone);

      // First check if user exists in our database
      console.log('[DB QUERY] Searching for user by phone...');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, phone, is_active, name, role')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      console.log('[DB QUERY] Result:', userData);
      console.log('[DB QUERY] Error:', userError);

      if (userError) {
        console.error('[DB QUERY] Database error occurred:', userError);
        return { error: new Error('Database error. Please try again.') };
      }

      if (!userData) {
        console.log('[DB QUERY] User not found for phone:', normalizedPhone);
        return { error: new Error('Invalid phone number or password') };
      }

      console.log('[DB QUERY] User found:', {
        id: userData.id,
        phone: userData.phone,
        name: userData.name,
        role: userData.role,
        is_active: userData.is_active,
      });

      if (!userData.is_active) {
        console.log('[AUTH] User account is inactive');
        return { error: new Error('Account is inactive. Please contact administrator.') };
      }

      // Generate email from normalized phone for Supabase auth
      const email = `${normalizedPhone}@txk-monitoring.local`;
      console.log('[AUTH] Attempting Supabase auth with email:', email);
      console.log('[AUTH] Password length:', password.length);

      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('[AUTH] Supabase auth error:', signInError);
        console.error('[AUTH] Error details:', {
          message: signInError.message,
          status: signInError.status,
          name: signInError.name,
        });

        // Provide more specific error messages
        if (signInError.message.includes('Invalid login credentials')) {
          return { error: new Error('Invalid phone number or password') };
        }

        return { error: new Error(signInError.message) };
      }

      if (!authData?.user) {
        console.error('[AUTH] No user returned from auth');
        return { error: new Error('Authentication failed') };
      }

      console.log('[AUTH] ✓ Login successful!');
      console.log('[AUTH] User ID:', authData.user.id);
      console.log('[AUTH] Session created');

      return { error: null };
    } catch (error) {
      console.error('[FATAL] Unexpected error during sign in:', error);
      return { error: error as Error };
    }
  };

  const signUp = async (phone: string, password: string, name: string, role: UserRole) => {
    try {
      const normalizedPhone = normalizePhoneNumber(phone);

      console.log('=== REGISTRATION ATTEMPT ===');
      console.log('Input phone:', phone);
      console.log('Normalized phone:', normalizedPhone);
      console.log('Name:', name);
      console.log('Role:', role);
      console.log('Password length:', password.length);

      // Check if phone already exists
      console.log('[DB QUERY] Checking if phone already exists...');
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, phone')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (checkError) {
        console.error('[DB QUERY] Error checking existing user:', checkError);
      }

      if (existingUser) {
        console.log('[DB QUERY] Phone number already registered:', normalizedPhone);
        return { error: new Error('Phone number already registered') };
      }

      console.log('[DB QUERY] Phone number available');

      // Create Supabase auth user
      const email = `${normalizedPhone}@txk-monitoring.local`;
      console.log('[AUTH] Creating Supabase auth user with email:', email);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
          data: {
            phone: normalizedPhone,
            name,
            role,
          },
        },
      });

      if (authError) {
        console.error('[AUTH] Supabase auth signup error:', authError);
        console.error('[AUTH] Error details:', {
          message: authError.message,
          status: authError.status,
        });
        return { error: authError };
      }

      if (!authData.user) {
        console.error('[AUTH] No user returned from signUp');
        return { error: new Error('Failed to create user') };
      }

      console.log('[AUTH] ✓ Supabase auth user created');
      console.log('[AUTH] User ID:', authData.user.id);
      console.log('[AUTH] Email:', authData.user.email);

      // Create database profile
      console.log('[DB INSERT] Creating user profile in database...');
      const { data: insertData, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          phone: normalizedPhone,
          name,
          role,
          is_active: true,
        })
        .select()
        .single();

      if (profileError) {
        console.error('[DB INSERT] Error creating user profile:', profileError);
        console.error('[DB INSERT] Error details:', {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
        });

        // Try to clean up the auth user if profile creation fails
        console.log('[CLEANUP] Attempting to delete auth user due to profile error...');
        await supabase.auth.admin.deleteUser(authData.user.id).catch((e) => {
          console.error('[CLEANUP] Failed to delete auth user:', e);
        });

        return { error: new Error('Failed to create user profile') };
      }

      console.log('[DB INSERT] ✓ User profile created:', insertData);
      console.log('[REGISTRATION] ✓✓✓ Registration successful! ✓✓✓');
      console.log('[REGISTRATION] User can now login with phone:', normalizedPhone);

      return { error: null };
    } catch (error) {
      console.error('[FATAL] Unexpected error during sign up:', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
