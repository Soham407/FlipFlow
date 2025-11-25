import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Share2 } from "lucide-react";
import { toast } from "sonner";
import { trackFlipbookView, trackTimeSpent } from "@/lib/analytics";
import { getR2PublicUrl } from "@/lib/r2";
import ViewerToolbar from "../components/ViewerToolbar";
import MobileViewerToolbar from "../components/MobileViewerToolbar";
import { useIsMobile } from "@/hooks/use-mobile";
import { DflipViewer } from "@/components/DflipViewer";
import type { Flipbook } from "@/types";

const Viewer = () => {
  const { id } = useParams();
  const isMobile = useIsMobile();
  const [flipbook, setFlipbook] = useState<Flipbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const viewIdRef = useRef<string | null>(null);
  const viewStartTimeRef = useRef<number>(Date.now());
  const sessionIdRef = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const fetchFlipbook = async () => {
      try {
        const routeParam = (id as string) || "";
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routeParam);
        const { data, error } = await supabase.from("flipbooks").select("*").eq(isUuid ? "id" : "slug", routeParam).maybeSingle();
        if (error) throw error;
        if (data) setFlipbook(data);
      } catch (error) {
        toast.error("Failed to load flipbook");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchFlipbook();
  }, [id]);

  useEffect(() => {
    if (flipbook?.file_path) {
      try {
        setPublicUrl(getR2PublicUrl(flipbook.file_path));
      } catch (error) {
        toast.error("Failed to load PDF");
      }
    }
  }, [flipbook]);

  useEffect(() => {
    const trackView = async () => {
      if (!flipbook?.id || viewIdRef.current) return;
      viewStartTimeRef.current = Date.now();
      try {
        const { data: viewId } = await supabase.rpc('track_flipbook_view', {
          _flipbook_id: flipbook.id,
          _session_id: sessionIdRef.current,
          _user_agent: navigator.userAgent,
          _ip_address: null,
        });
        viewIdRef.current = viewId;
        trackFlipbookView(flipbook.id, flipbook.title);
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    };
    if (flipbook && publicUrl) trackView();
  }, [flipbook, publicUrl]);

  useEffect(() => {
    const updateTime = async () => {
      if (viewIdRef.current) {
        const time = Math.floor((Date.now() - viewStartTimeRef.current) / 1000);
        if (time > 0) await supabase.rpc('update_view_time_spent', { _view_id: viewIdRef.current, _time_spent_seconds: time });
      }
    };
    window.addEventListener('beforeunload', updateTime);
    return () => {
      window.removeEventListener('beforeunload', updateTime);
      updateTime();
    };
  }, [flipbook]);

  // Handle click-outside-to-close for mobile thumbnail sidebar
  useEffect(() => {
    if (!isMobile) return;

    let overlay: HTMLElement | null = null;
    let observer: MutationObserver | null = null;
    let cleanupFn: (() => void) | null = null;

    const setupOverlay = () => {
      const container = document.getElementById("flipbookContainer");
      if (!container || !(window as { jQuery?: unknown }).jQuery) return;

      const $container = ((window as { jQuery: (el: HTMLElement) => { find: (selector: string) => { length: number; on: (event: string, handler: () => void) => void } } }).jQuery)(container);
      const $sidemenu = $container.find(".df-sidemenu");
      if (!$sidemenu.length) return;

      // Create overlay at body level for proper z-index stacking
      overlay = document.body.querySelector(".df-sidemenu-overlay") as HTMLElement;
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "df-sidemenu-overlay";
        document.body.appendChild(overlay);
      }

      // Click/touch handler to close sidebar
      const handleClick = (e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const $currentSidemenu = $container.find(".df-sidemenu");
        if ($currentSidemenu.hasClass("df-sidemenu-visible")) {
          $currentSidemenu.removeClass("df-sidemenu-visible");
        }
      };

      overlay.addEventListener("click", handleClick);
      overlay.addEventListener("touchend", handleClick);

      // Function to update overlay visibility
      const updateOverlay = () => {
        if (!overlay) return;
        const isVisible = $sidemenu.hasClass("df-sidemenu-visible");
        if (isVisible) {
          overlay.style.opacity = "1";
          overlay.style.visibility = "visible";
          overlay.style.pointerEvents = "auto";
        } else {
          overlay.style.opacity = "0";
          overlay.style.visibility = "hidden";
          overlay.style.pointerEvents = "none";
        }
      };

      // Document-level click handler as backup (only active when sidebar is open)
      let documentClickHandler: ((e: MouseEvent | TouchEvent) => void) | null = null;
      
      const enableDocumentClick = () => {
        if (documentClickHandler) return; // Already enabled
        documentClickHandler = (e: MouseEvent | TouchEvent) => {
          const target = e.target as HTMLElement;
          // Don't close if clicking on sidebar, toolbar, or overlay
          if (
            target.closest(".df-sidemenu") ||
            target.closest("[class*='toolbar']") ||
            target.closest(".df-sidemenu-overlay") ||
            target.closest("button")
          ) {
            return;
          }
          const $currentSidemenu = $container.find(".df-sidemenu");
          if ($currentSidemenu.hasClass("df-sidemenu-visible")) {
            $currentSidemenu.removeClass("df-sidemenu-visible");
          }
        };
        document.addEventListener("click", documentClickHandler, true);
        document.addEventListener("touchend", documentClickHandler, true);
      };

      const disableDocumentClick = () => {
        if (documentClickHandler) {
          document.removeEventListener("click", documentClickHandler, true);
          document.removeEventListener("touchend", documentClickHandler, true);
          documentClickHandler = null;
        }
      };

      // Enhanced update function that also manages document click handler
      const updateOverlayEnhanced = () => {
        updateOverlay();
        const isVisible = $sidemenu.hasClass("df-sidemenu-visible");
        if (isVisible) {
          enableDocumentClick();
        } else {
          disableDocumentClick();
        }
      };

      // Watch for sidebar visibility changes
      observer = new MutationObserver(updateOverlayEnhanced);

      observer.observe($sidemenu[0], {
        attributes: true,
        attributeFilter: ["class"]
      });

      // Also listen for clicks on the grid button to update overlay
      const handleGridButtonClick = () => {
        setTimeout(updateOverlayEnhanced, 100); // Small delay to let class change
      };

      // Find grid buttons and add listeners
      const gridButtons = document.querySelectorAll('[title*="Thumbnail"], [title*="thumbnail"], [title*="Grid"], [title*="grid"]');
      const gridButtonListeners: Array<{ element: Element; handler: () => void }> = [];
      gridButtons.forEach(btn => {
        btn.addEventListener('click', handleGridButtonClick);
        gridButtonListeners.push({ element: btn, handler: handleGridButtonClick });
      });

      // Initial check
      updateOverlayEnhanced();

      // Periodic check as fallback
      const checkInterval = setInterval(updateOverlayEnhanced, 500);

      cleanupFn = () => {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        if (checkInterval) clearInterval(checkInterval);
        disableDocumentClick();
        if (overlay) {
          overlay.removeEventListener("click", handleClick);
          overlay.removeEventListener("touchend", handleClick);
        }
        gridButtonListeners.forEach(({ element, handler }) => {
          element.removeEventListener('click', handler);
        });
      };
    };

    // Wait for container and jQuery to be ready
    let checkInterval: NodeJS.Timeout | null = null;
    let retries = 0;
    const maxRetries = 30; // 9 seconds max

    const checkReady = () => {
      if ((window as { jQuery?: unknown }).jQuery && document.getElementById("flipbookContainer")) {
        if (checkInterval) clearInterval(checkInterval);
        setupOverlay();
      } else if (retries < maxRetries) {
        retries++;
      } else {
        if (checkInterval) clearInterval(checkInterval);
      }
    };

    checkInterval = setInterval(checkReady, 300);
    checkReady(); // Try immediately

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (cleanupFn) cleanupFn();
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    };
  }, [isMobile, flipbook]);

  if (loading || !flipbook || !publicUrl) {
    return <div className="flex min-h-screen items-center justify-center"><Card><CardContent className="py-8"><p className="text-muted-foreground">Loading...</p></CardContent></Card></div>;
  }

  const readingPercent = totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;

  return (
    <div className="flex flex-col h-[100dvh] relative 	bg-[#EDEDED] overflow-hidden" >
      {/* Desktop Header */}
      {!isMobile && (
        <header className="flex items-center justify-between px-4 py-3 bg-background border-b z-30">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm"><Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-2" />Dashboard</Link></Button>
            <h1 className="text-lg font-semibold truncate max-w-[40vw]">{flipbook.title}</h1>
          </div>
          <Button variant="outline" size="sm" onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}/view/${flipbook.slug || flipbook.id}`); toast.success("Link copied!"); }}>
            <Share2 className="h-4 w-4 mr-2" />Share
          </Button>
        </header>
      )}

      {/* Floating Back Button (Mobile) */}
      {isMobile && (
        <Button asChild variant="ghost" size="icon" className="fixed top-4 left-4 z-50 rounded-full bg-background/60 backdrop-blur-md shadow-sm border border-border/40">
          <Link to="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
      )}

      {/* 📱 MOBILE TOOLBAR: FLOATING AT BOTTOM */}
      {isMobile && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
          <div className="pointer-events-auto">
            <MobileViewerToolbar pdfUrl={publicUrl} />
          </div>
        </div>
      )}

      {/* Desktop Toolbar */}
      {!isMobile && <ViewerToolbar pdfUrl={publicUrl} />}

      {/* Main Viewer Area - NOW FILLS THE WHOLE SCREEN BEHIND THE TOOLBAR */}
      <main className="flex-1 overflow-hidden relative z-0">
        <DflipViewer
          pdfUrl={publicUrl}
          flipbookId={flipbook.id}
          onProgress={() => {}}
          onReady={() => {}}
          onPageChange={(current, total) => {
            setCurrentPage(current);
            setTotalPages(total);
          }}
        />
      </main>

      {/* Reading Progress Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-[3px] bg-muted/30 z-40">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${readingPercent}%` }}
        />
      </div>
    </div>
  );
};

export default Viewer;
