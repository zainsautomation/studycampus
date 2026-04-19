import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Redirects authenticated users who haven't completed onboarding
 * (e.g. signed in via Google but never entered an invite code)
 * to /complete-profile. Allowed routes are excluded.
 */
const ALLOWED_PATHS = ['/complete-profile', '/auth', '/terms'];

export function OnboardingGate({ children }: { children: ReactNode }) {
  const { user, isLoading, onboardingComplete } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    if (onboardingComplete === false && !ALLOWED_PATHS.includes(location.pathname)) {
      navigate('/complete-profile', { replace: true });
    }
  }, [user, isLoading, onboardingComplete, location.pathname, navigate]);

  return <>{children}</>;
}
