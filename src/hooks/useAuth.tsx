import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'student';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  onboardingComplete: boolean | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, inviteCode: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
    return data?.role as AppRole | null;
  };

  const fetchOnboarding = async (userId: string): Promise<boolean | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('Error fetching onboarding state:', error);
      return null;
    }
    return data?.onboarding_complete ?? null;
  };

  useEffect(() => {
    let isMounted = true;

    const checkUserMeta = async (userId: string) => {
      try {
        const [fetchedRole, onboarded] = await Promise.all([
          fetchUserRole(userId),
          fetchOnboarding(userId),
        ]);
        if (!isMounted) return;
        setRole(fetchedRole);
        setOnboardingComplete(onboarded);
      } catch {
        if (isMounted) {
          setRole(null);
          setOnboardingComplete(null);
        }
      }
    };

    // Listener for ONGOING auth changes (does NOT control isLoading)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer to avoid deadlock inside onAuthStateChange
          setTimeout(() => checkUserMeta(session.user.id), 0);
        } else {
          setRole(null);
          setOnboardingComplete(null);
        }
      }
    );

    // INITIAL load (controls isLoading)
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await checkUserMeta(session.user.id);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string, inviteCode: string) => {
    // Validate invite code via edge function (server-side)
    const { data: validateData, error: validateError } = await supabase.functions.invoke('validate-invite-code', {
      body: { code: inviteCode }
    });

    if (validateError) {
      console.error('Error validating invite code:', validateError);
      return { error: new Error('Failed to validate invite code') };
    }

    if (!validateData?.valid) {
      return { error: new Error(validateData?.error || 'Invalid or expired invite code') };
    }

    const { codeId, currentUses } = validateData;

    // Use the invite code (increment usage) via edge function
    const { data: useData, error: useError } = await supabase.functions.invoke('use-invite-code', {
      body: { codeId, currentUses }
    });

    if (useError || !useData?.success) {
      console.error('Failed to use invite code:', useError || useData?.error);
      // Continue with signup even if increment fails
    }

    // Sign up the user
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return { error: error as Error };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        isLoading,
        isAdmin: role === 'admin',
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
