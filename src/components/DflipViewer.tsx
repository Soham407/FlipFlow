import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { DflipOptions, DflipInstance } from "@/types";

interface DflipViewerProps {
  pdfUrl: string;
  flipbookId: string;
  onReady?: () => void;
  onProgress?: (progress: number) => void;
  onPageChange?: (current: number, total: number) => void;
}

export const DflipViewer = ({
  pdfUrl,
  flipbookId,
  onReady,
  onProgress,
  onPageChange,
}: DflipViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptsReady, setScriptsReady] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const flipbookInitialized = useRef(false);

  const pagePollRef = useRef<number | null>(null);
  const lastPageRef = useRef<number>(-1);
  const lastTotalRef = useRef<number>(-1);

  // Use hook, but we will also double-check width manually
  const isMobile = useIsMobile();

  // Check if dflip scripts are loaded
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 50;

    const checkScripts = () => {
      if (
        typeof window.$ !== "undefined" &&
        typeof window.loadFlipbook === "function" &&
        typeof window.getLastPage === "function"
      ) {
        setScriptsReady(true);
        setScriptError(false);
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(checkScripts, 100);
      } else {
        console.error("Dflip scripts failed to load after maximum retries");
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
      setIsReady(true);
      onReady?.();
      startPagePolling();
    };

    return () => {
      delete window.onPdfProgress;
      delete window.onPdfReady;
      stopPagePolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptsReady, onReady, onProgress]);

  // Initialize the flipbook
  useEffect(() => {
    if (!scriptsReady || !pdfUrl || flipbookInitialized.current) {
      return;
    }

    if (!containerRef.current) {
      return;
    }

    const initFlipbook = () => {
      try {
        // Double check width manually to ensure mobile detection is accurate at this exact moment
        const isSmallScreen = window.innerWidth < 768;
        const shouldUseSingleMode = isMobile || isSmallScreen;

        if (containerRef.current) {
          // ✅ Sanitize ID for safe variable naming and FORCE SINGLE PAGE MODE via Global Option
          const sanitizedId = flipbookId.replace(/[^a-zA-Z0-9]/g, "_");
          const optionName = `option_${sanitizedId}`;

          // We set specific flags that dFlip uses to determine layout
          const config: DflipOptions = {
            // 1 = Single Page (Slide), 2 = Double Page (Book)
            pageMode: shouldUseSingleMode ? 1 : 2,

            // Some versions of dFlip use this flag specifically
            singlePageMode: shouldUseSingleMode,

            // Force 3D on mobile for the "Stack" effect
            webgl: true,

            height: "100%",
            duration: 800,

            // Disables the "Smart" auto-switch that might be forcing Double mode on wider phones
            autoPageMode: false,
          };
          (window as any)[optionName] = config;

          containerRef.current.innerHTML = "";
          window.loadFlipbook(
            containerRef.current,
            pdfUrl,
            false,
            1,
            flipbookId
          );

          flipbookInitialized.current = true;
        }
      } catch (error) {
        console.error("Error initializing flipbook:", error);
        setScriptError(true);
      }
    };

    const timeoutId = setTimeout(initFlipbook, 50);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [scriptsReady, pdfUrl, flipbookId, isMobile]);

  // ... (Rest of the file: pollPages, startPagePolling, stopPagePolling, cleanup, return)
  // KEEP THE REST OF THE FILE EXACTLY AS IT WAS BEFORE
  // (I am omitting it to save space, but ensure you copy the polling/render logic from previous version)

  // ⬇️ RE-INSERTING THE POLLING AND RENDER LOGIC FOR YOU TO COPY-PASTE IF NEEDED ⬇️
  const pollPages = () => {
    try {
      if (!containerRef.current) return;
      const $container = window.jQuery?.(containerRef.current);
      const flipbook = $container?.data("dflip") as DflipInstance;
      const target = flipbook?.target || flipbook;
      const current =
        target?._activePage ??
        target?.currentPage ??
        target?.currentPageNum ??
        flipbook?.currentPage ??
        flipbook?.pageNumber;
      const total =
        target?.totalPages ??
        target?.pageCount ??
        target?.pages?.length ??
        flipbook?.totalPages;
      if (typeof current === "number" && typeof total === "number") {
        if (current !== lastPageRef.current || total !== lastTotalRef.current) {
          lastPageRef.current = current;
          lastTotalRef.current = total;
          onPageChange?.(current, total);
        }
      }
    } catch (error) {
      // Silent catch - polling error is non-critical
    }
  };

  const startPagePolling = () => {
    if (pagePollRef.current) return;
    pagePollRef.current = window.setInterval(pollPages, 500);
  };

  const stopPagePolling = () => {
    if (pagePollRef.current) {
      window.clearInterval(pagePollRef.current);
      pagePollRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (flipbookInitialized.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        const currentContainer = containerRef.current;
        if (currentContainer) {
          try {
            const $container = window.$(currentContainer);
            if (
              $container &&
              $container.data &&
              typeof $container.data("dflip") !== "undefined"
            ) {
              const flipbook = $container.data("dflip");
              if (flipbook && typeof flipbook.dispose === "function") {
                flipbook.dispose();
              }
            }
          } catch (error) {
            console.warn("Error disposing flipbook:", error);
          }
          flipbookInitialized.current = false;
        }
      }
      stopPagePolling();
    };
  }, []);

  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (isReady && !localStorage.getItem("flipflow_view_hint_shown")) {
      setShowHint(true);
    }
  }, [isReady]);

  const dismissHint = () => {
    setShowHint(false);
    localStorage.setItem("flipflow_view_hint_shown", "true");
  };

  if (scriptError) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Viewer</AlertTitle>
        <AlertDescription>
          Failed to load the flipbook viewer scripts. Please refresh the page
          and try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="relative w-full h-full">
      {(!scriptsReady || !isReady) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl space-y-4">
            <Skeleton className="w-full h-[420px] rounded-lg" />
            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
                <span>Loading flipbook...</span>
                <span>{loadingProgress}%</span>
              </div>
              <div className="w-full bg-secondary/40 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        id="flipbookContainer"
        className="w-full h-full"
        style={{ visibility: !scriptsReady || !isReady ? "hidden" : "visible" }}
      />

      {showHint && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-500 cursor-pointer"
          onClick={dismissHint}
        >
          <div className="text-center text-white p-6 max-w-sm">
            <div className="flex justify-center items-center gap-8 text-6xl mb-6">
              <span className="animate-bounce [animation-delay:-0.3s]">👈</span>
              <span className="text-4xl opacity-50">📖</span>
              <span className="animate-bounce">👉</span>
            </div>
            <h3 className="text-xl font-bold mb-2">
              {isMobile ? "Swipe to turn pages" : "Click edges to turn pages"}
            </h3>
            <p className="text-sm opacity-80">Tap anywhere to start reading</p>
            <div className="mt-8 px-4 py-2 border border-white/30 rounded-full text-xs font-medium bg-white/10">
              Got it
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
