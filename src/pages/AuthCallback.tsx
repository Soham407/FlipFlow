import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    console.log('AuthCallback: Component mounted');
    console.log('AuthCallback: Full URL:', window.location.href);
    console.log('AuthCallback: URL hash:', window.location.hash);
    console.log('AuthCallback: URL search:', window.location.search);
    console.log('AuthCallback: Hash substring:', window.location.hash.substring(0, 50) + '...');
    
    // Check for OAuth errors in the hash
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const error = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');
      
      if (error) {
        console.error('AuthCallback: OAuth error in hash:', error, errorDescription);
        setProcessing(false);
        
        // Show user-friendly error message
        if (error === 'server_error' && errorDescription?.includes('Database error')) {
          alert('There was a database error creating your account. Please try again in a few moments or contact support if the issue persists.');
        } else {
          alert(`OAuth Error: ${errorDescription || error}`);
        }
        
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
        return () => {};
      }
    }
    
    // Listen for auth state changes - this will fire when OAuth completes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthCallback: Auth state changed - Event:', event, 'Session:', session ? 'Exists' : 'None');
      
      if (event === 'SIGNED_IN' || session) {
        console.log('AuthCallback: User signed in, redirecting to dashboard');
        setProcessing(false);
        navigate('/dashboard', { replace: true });
      } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // Wait a bit and check if we have a session
        setTimeout(async () => {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          console.log('AuthCallback: After event, session:', currentSession ? 'Exists' : 'None');
          if (currentSession) {
            navigate('/dashboard', { replace: true });
          } else {
            navigate('/login', { replace: true });
          }
        }, 500);
      }
    });

    // Also try to get session initially
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthCallback: Initial session check - Session:', session ? 'Exists' : 'None');
      if (session) {
        console.log('AuthCallback: Initial session exists, redirecting to dashboard');
        setProcessing(false);
        navigate('/dashboard', { replace: true });
      } else {
        // If no session and no hash, redirect to login after timeout
        const hash = window.location.hash;
        if (!hash || !hash.includes('access_token')) {
          console.log('AuthCallback: No session and no OAuth hash, redirecting to login');
          setTimeout(() => {
            setProcessing(false);
            navigate('/login', { replace: true });
          }, 3000);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;

