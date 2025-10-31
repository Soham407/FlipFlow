import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Loader2, Share2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import ViewerToolbar from "../components/ViewerToolbar";
import MobileViewerToolbar from "../components/MobileViewerToolbar";
import { useIsMobile } from "@/hooks/use-mobile";

// TypeScript declarations for global functions
declare global {
  interface Window {
    $: any;
    jQuery: any;
    loadFlipbook: (url: string, isSinglePage: boolean, page: number, pdfId: string) => void;
    getLastPage: (pdfId: string) => Promise<number>;
    onPdfProgress?: (progress: number) => void;
    onPdfReady?: () => void;
  }
}

interface Flipbook {
  id: string;
  title: string;
  file_path: string;
  is_public?: boolean;
}

const Viewer = () => {
  const { id } = useParams();
  const isMobile = useIsMobile();
  const [flipbook, setFlipbook] = useState<Flipbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [scriptsReady, setScriptsReady] = useState(false);
  const [pdfLoadingProgress, setPdfLoadingProgress] = useState(0);
  const [isPdfReady, setIsPdfReady] = useState(false);
  const [scriptError, setScriptError] = useState(false);

  // Check if all scripts are loaded
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 50; // 5 seconds total
    
    const checkScripts = () => {
      if (
        typeof window.$ !== 'undefined' &&
        typeof window.loadFlipbook === 'function' &&
        typeof window.getLastPage === 'function'
      ) {
        setScriptsReady(true);
        setScriptError(false);
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(checkScripts, 100);
      } else {
        console.error("Scripts failed to load after maximum retries");
        setScriptError(true);
      }
    };
    
    checkScripts();
  }, []);

  // Fetch flipbook data from Supabase
  useEffect(() => {
    const fetchFlipbook = async () => {
      try {
        const { data, error } = await supabase
          .from("flipbooks")
          .select("*")
          .eq("id", id as string)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setFlipbook(data as any);
        }
      } catch (error: any) {
        toast.error("Failed to load flipbook");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchFlipbook();
    }
  }, [id]);

  // Get public URL from Supabase storage when flipbook data is available
  useEffect(() => {
    const getPublicUrl = async () => {
      if (flipbook?.file_path) {
        try {
          const { data } = supabase.storage
            .from('user_pdfs')
            .getPublicUrl(flipbook.file_path);
          
          setPublicUrl(data.publicUrl);
        } catch (error) {
          console.error('Error getting public URL:', error);
          toast.error("Failed to load PDF file");
        }
      }
    };

    getPublicUrl();
  }, [flipbook]);

  // Set up callbacks for PDF loading progress
  useEffect(() => {
    window.onPdfProgress = (progress: number) => {
      setPdfLoadingProgress(progress);
    };

    window.onPdfReady = () => {
      setIsPdfReady(true);
    };

    return () => {
      window.onPdfProgress = undefined;
      window.onPdfReady = undefined;
    };
  }, []);

  // Initialize flipbook when scripts and data are ready
  useEffect(() => {
    if (scriptsReady && publicUrl && flipbook) {
      setIsPdfReady(false);
      setPdfLoadingProgress(0);
      
      setTimeout(() => {
        console.log('✅ Initializing flipbook...');
        
        const urlParams = new URLSearchParams(window.location.search);
        const pageFromUrl = parseInt(urlParams.get('page') || 'NaN', 10);
        
        const pdfId = flipbook.id || publicUrl;

        if (!isNaN(pageFromUrl)) {
          window.loadFlipbook(publicUrl, false, pageFromUrl, pdfId);
        } else {
          window.getLastPage(pdfId).then((storedPage: number) => {
            window.loadFlipbook(publicUrl, false, storedPage || 1, pdfId);
          });
        }
      }, 0);
    }
  }, [scriptsReady, publicUrl, flipbook]);

  // Show error state
  if (scriptError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Viewer</AlertTitle>
          <AlertDescription>
            The document viewer failed to load. Please refresh the page or try again later.
          </AlertDescription>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </Alert>
      </div>
    );
  }

  // Show loading state with skeleton
  if (loading || !scriptsReady || !flipbook || !publicUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <div className="text-center w-full max-w-4xl">
          <Skeleton className="w-full h-[80vh] mb-4 rounded-lg" />
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading flipbook data...' : 
             !scriptsReady ? 'Loading PDF viewer...' :
             !flipbook ? 'Preparing flipbook...' :
             'Loading PDF file...'}
          </p>
        </div>
      </div>
    );
  }

  if (!flipbook) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Flipbook not found</p>
            <Button asChild className="mt-4">
              <Link to="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Button asChild variant="outline" size="sm" className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 text-xs sm:text-sm">
        <Link to="/dashboard">
          <ArrowLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Back</span>
        </Link>
      </Button>
      {/* Top-right Share Button */}
      <Button
        variant="outline"
        size="sm"
        className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 text-xs sm:text-sm"
        title="Share"
        onClick={async () => {
          try {
            // Ensure this flipbook is marked public for anonymous viewing
            if (id && !flipbook?.is_public) {
              const { error } = await supabase
                .from('flipbooks')
                .update({ is_public: true })
                .eq('id', id as string);
              if (error) throw error;
              setFlipbook(prev => prev ? { ...prev, is_public: true } : prev);
            }

            const url = window.location.href;
            await navigator.clipboard.writeText(url);
            toast.success("Public link copied to clipboard!");
          } catch (e) {
            toast.error("Failed to make public or copy link");
          }
        }}
      >
        <Share2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline">Share</span>
        <span className="sm:hidden">Copy</span>
      </Button>
      {/* Toolbar Row */}
      <div className="fixed z-20 left-1/2 bottom-4 sm:bottom-6 -translate-x-1/2 w-[calc(100%-1rem)] sm:w-auto max-w-full overflow-x-auto px-2 sm:px-0">
        {isMobile ? (
          <MobileViewerToolbar pdfUrl={publicUrl || undefined} />
        ) : (
          <ViewerToolbar pdfUrl={publicUrl || undefined} />
        )}
      </div>

      {/* PDF Loading Overlay */}
      {!isPdfReady && (
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 z-30">
          <div className="text-center px-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm sm:text-base text-muted-foreground">
              Loading PDF {Math.round(pdfLoadingProgress)}%
            </p>
          </div>
        </div>
      )}

      <div id="flipbookContainer" className="w-full h-full"></div>
    </div>
  );
};

export default Viewer;
