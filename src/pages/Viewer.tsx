import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useScript } from "@/hooks/useScript";
import ViewerToolbar from "../components/ViewerToolbar";

// TypeScript declarations for jQuery and dflip
declare global {
  interface Window {
    $: any;
    jQuery: any;
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

  // Load jQuery first
  const { loaded: jqueryLoaded, error: jqueryError } = useScript({
    src: '/lib/js/libs/jquery.min.js',
    enabled: true
  });

  // Load pageMemory.js only after jQuery is loaded
  const { loaded: pageMemoryLoaded, error: pageMemoryError } = useScript({
    src: '/lib/js/pageMemory.js',
    enabled: jqueryLoaded
  });

  // Load dflip.js only after pageMemory is loaded
  const { loaded: dflipLoaded, error: dflipError } = useScript({
    src: '/lib/js/dflip.js',
    enabled: pageMemoryLoaded
  });

  // Load load.js only after dflip is loaded
  const { loaded: loadLoaded, error: loadError } = useScript({
    src: '/lib/js/load.js',
    enabled: dflipLoaded
  });

  // Fetch flipbook data from Supabase
  useEffect(() => {
    const fetchFlipbook = async () => {
      try {
        const { data, error } = await supabase
          .from("flipbooks")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setFlipbook(data);
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

  // Initialize flipbook when load.js and publicUrl are ready
  useEffect(() => {
    // Check if all necessary functions and data are available
    if (loadLoaded && publicUrl && flipbook && (window as any).loadFlipbook && (window as any).getLastPage) {
      
      // Use a minimal timeout to ensure the DOM is fully ready after this render
      setTimeout(() => {
        console.log('✅ loadFlipbook and dependencies are ready. Initializing...');
        
        const urlParams = new URLSearchParams(window.location.search);
        const pageFromUrl = parseInt(urlParams.get('page') || 'NaN', 10);
        
        // Use the flipbook ID for persistence, fall back to URL
        const pdfId = flipbook.id || publicUrl; 

        if (!isNaN(pageFromUrl)) {
            // If page is in URL params, use that
            (window as any).loadFlipbook(publicUrl, false, pageFromUrl, pdfId);
        } else {
            // If no page in URL, try to get from IndexedDB (pageMemory.js)
            (window as any).getLastPage(pdfId).then(function(storedPage: number) {
                (window as any).loadFlipbook(publicUrl, false, storedPage || 1, pdfId);
            });
        }
      }, 0);

    } else if (loadLoaded && publicUrl && flipbook) {
      // This else-if helps debug if functions are missing
      console.error('❌ Critical error: loadFlipbook or getLastPage function is not available on window.');
    }
  }, [loadLoaded, publicUrl, flipbook]); // Add flipbook as a dependency

  // Show loading state while scripts are loading or data is fetching
  if (loading || !jqueryLoaded || !pageMemoryLoaded || !dflipLoaded || !loadLoaded || !flipbook || !publicUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {loading ? 'Loading flipbook...' : 
             !jqueryLoaded ? 'Loading jQuery...' :
             !pageMemoryLoaded ? 'Loading page memory...' :
             !dflipLoaded ? 'Loading PDF viewer...' :
             !loadLoaded ? 'Loading flipbook loader...' :
             !flipbook ? 'Loading flipbook data...' :
             'Preparing PDF...'}
          </p>
        </div>
      </div>
    );
  }

  // Show error states
  if (jqueryError || pageMemoryError || dflipError || loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Failed to load PDF viewer</p>
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
      <div className="absolute z-20 left-1/2 top-6 -translate-x-1/2">
        <ViewerToolbar pdfUrl={publicUrl} />
      </div>

      <div id="flipbookContainer" className="h-full w-full" style={{
        position: 'relative',
        overflow: 'hidden',
        zIndex: 1
      }}></div>
    </div>
  );
};

export default Viewer;
