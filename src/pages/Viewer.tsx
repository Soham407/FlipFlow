import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ViewerToolbar from "../components/ViewerToolbar";

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
}

const Viewer = () => {
  const { id } = useParams();
  const [flipbook, setFlipbook] = useState<Flipbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [scriptsReady, setScriptsReady] = useState(false);
  const [pdfLoadingProgress, setPdfLoadingProgress] = useState(0);
  const [isPdfReady, setIsPdfReady] = useState(false);

  // Check if all scripts are loaded
  useEffect(() => {
    const checkScripts = () => {
      if (
        typeof window.$ !== 'undefined' &&
        typeof window.loadFlipbook === 'function' &&
        typeof window.getLastPage === 'function'
      ) {
        setScriptsReady(true);
      } else {
        setTimeout(checkScripts, 100);
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

  // Show loading state
  if (loading || !scriptsReady || !flipbook || !publicUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {loading ? 'Loading flipbook...' : 
             !scriptsReady ? 'Loading PDF viewer...' :
             !flipbook ? 'Loading flipbook data...' :
             'Preparing PDF...'}
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
      <Button asChild variant="outline" className="absolute top-4 left-4 z-10">
        <Link to="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>
      {/* Toolbar Row */}
      <div className="absolute z-20 left-1/2 bottom-6 -translate-x-1/2">
        <ViewerToolbar pdfUrl={publicUrl} />
      </div>

      {/* PDF Loading Overlay */}
      {!isPdfReady && (
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 z-30">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              Loading PDF {Math.round(pdfLoadingProgress)}%
            </p>
          </div>
        </div>
      )}

      <div id="flipbookContainer" className="w-full"></div>
    </div>
  );
};

export default Viewer;
