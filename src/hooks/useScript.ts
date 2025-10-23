import { useEffect, useState } from 'react';

interface UseScriptOptions {
  src: string;
  enabled?: boolean;
}

interface UseScriptReturn {
  loaded: boolean;
  error: boolean;
  loading: boolean;
}

export const useScript = ({ src, enabled = true }: UseScriptOptions): UseScriptReturn => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !src) {
      setLoaded(false);
      setError(false);
      setLoading(false);
      return;
    }

    // Check if script is already loaded
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      setLoaded(true);
      setError(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);
    setLoaded(false);

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.type = 'text/javascript'; // Ensure classic script mode, not module

    const handleLoad = () => {
      setLoaded(true);
      setLoading(false);
      setError(false);
    };

    const handleError = () => {
      setError(true);
      setLoading(false);
      setLoaded(false);
    };

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
      // Don't remove the script from DOM as it might be needed by other components
    };
  }, [src, enabled]);

  return { loaded, error, loading };
};
