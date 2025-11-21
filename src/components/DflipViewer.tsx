import { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface DflipViewerProps {
  pdfUrl: string;
  flipbookId: string;
  onReady?: () => void;
  onProgress?: (progress: number) => void;
}

declare global {
  interface Window {
    $: any;
    jQuery: any;
    // Updated signature to accept element
    loadFlipbook: (element: HTMLElement, url: string, rtlMode: boolean, page: number, pdfId: string) => void;
    getLastPage: (pdfId: string) => Promise<number>;
    onPdfProgress?: (progress: number) => void;
    onPdfReady?: () => void;
    isMobileDevice?: boolean;
  }
}

export const DflipViewer = ({ pdfUrl, flipbookId, onReady, onProgress }: DflipViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptsReady, setScriptsReady] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const flipbookInitialized = useRef(false);

  // Check if dflip scripts are loaded
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 50; // 5 seconds total

    const checkScripts = () => {
      if (
        typeof window.$ !== 'undefined' &&
        typeof window.loadFlipbook === 'function' &&
        typeof window.getLastPage === 'function'
      ) {
        console.log('Dflip scripts ready');
        setScriptsReady(true);
        setScriptError(false);
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(checkScripts, 100);
      } else {
        console.error('Dflip scripts failed to load after maximum retries');
        setScriptError(true);
      }
    };

    checkScripts();
  }, []);

  // Set up progress and ready callbacks
  useEffect(() => {
    if (!scriptsReady) return;

    window.onPdfProgress = (progress: number) => {
      setLoadingProgress(progress);
      onProgress?.(progress);
    };

    window.onPdfReady = () => {
      console.log('PDF ready in viewer');
      setIsReady(true);
      onReady?.();
    };

    return () => {
      delete window.onPdfProgress;
      delete window.onPdfReady;
    };
  }, [scriptsReady, onReady, onProgress]);

  // Initialize the flipbook
  useEffect(() => {
    if (!scriptsReady || !pdfUrl || flipbookInitialized.current) {
      return;
    }

    // Ensure container exists before calling the library
    if (!containerRef.current) {
        console.warn("Container ref is null, retrying...");
        return;
    }

    const initFlipbook = () => {
      try {
        console.log('Initializing flipbook viewer:', { pdfUrl, flipbookId });
        
        if (containerRef.current) {
            containerRef.current.innerHTML = ''; // Clean up previous
            
            // PASS THE DOM ELEMENT DIRECTLY
            window.loadFlipbook(containerRef.current, pdfUrl, false, 1, flipbookId);
            
            flipbookInitialized.current = true;
        }
      } catch (error) {
        console.error('Error initializing flipbook:', error);
        setScriptError(true);
      }
    };

    const timeoutId = setTimeout(initFlipbook, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [scriptsReady, pdfUrl, flipbookId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flipbookInitialized.current && containerRef.current) {
        try {
          const $container = window.$(containerRef.current);
          if ($container && $container.data && typeof $container.data('dflip') !== 'undefined') {
            const flipbook = $container.data('dflip');
            if (flipbook && typeof flipbook.dispose === 'function') {
              flipbook.dispose();
            }
          }
        } catch (error) {
          console.warn('Error disposing flipbook:', error);
        }
        flipbookInitialized.current = false;
      }
    };
  }, []); 

  if (scriptError) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Viewer</AlertTitle>
        <AlertDescription>
          Failed to load the flipbook viewer scripts. Please refresh the page and try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[600px]">
      {/* Loading Overlay - shows on top of the hidden container */}
      {(!scriptsReady || !isReady) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background p-4">
          <div className="w-full max-w-3xl space-y-4">
            <Skeleton className="w-full h-[500px] rounded-lg" />
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Loading flipbook...</span>
                <span>{loadingProgress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* The actual Flipbook Container - VISIBLE but potentially empty or hidden by overlay */}
      <div 
        ref={containerRef}
        id="flipbookContainer"
        className="w-full h-full"
        style={{ visibility: (!scriptsReady || !isReady) ? 'hidden' : 'visible' }} 
      />
    </div>
  );
};