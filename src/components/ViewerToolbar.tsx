import React, { useState, useEffect } from "react";
import { Share2, RectangleHorizontal, Fullscreen } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

const iconClass = "w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600";
const btnClass =
  "bg-white hover:bg-gray-100 rounded-full flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 transition-colors border border-gray-200";

// --- INTERFACE REVERTED ---
interface ViewerToolbarProps {
  pdfUrl?: string;
}

function ViewerToolbar({ pdfUrl }: ViewerToolbarProps) {
  const [isReady, setIsReady] = useState(false);
  const [isThumbnailVisible, setIsThumbnailVisible] = useState(false);
  const [isSinglePage, setIsSinglePage] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [inputValue, setInputValue] = useState<string>("1");

  // Check if dFlip is ready and sync thumbnail state
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 20;
    
    const checkReady = () => {
      const flipbook = (window as any).currentFlipbook;
      
      if (flipbook && window.jQuery) {
        setIsReady(true);
        
        // Check initial page mode from dFlip target
        try {
          const target = flipbook.target || flipbook;
          const currentMode = target?.pageMode; // 1 = SINGLE, 2 = DOUBLE
          const isCurrentlySingle = currentMode === 1;
          setIsSinglePage(!!isCurrentlySingle);
          console.log("✅ Toolbar ready - initial page mode:", isCurrentlySingle ? "single" : "double", "currentMode:", currentMode);

          // Initialize page state
          const initialCurrent = target?.currentPage || target?.currentPageNum || flipbook?.currentPage || 1;
          const initialTotal = target?.totalPages || target?.pageCount || target?.pages?.length || flipbook?.totalPages || 0;
          if (typeof initialCurrent === "number") {
            setCurrentPage(initialCurrent);
            setInputValue(String(initialCurrent));
          }
          if (typeof initialTotal === "number") {
            setTotalPages(initialTotal);
          }
        } catch (e) {
          console.warn("⚠️ Unable to read initial page mode", e);
        }
        
        const $container = window.jQuery("#flipbookContainer");
        const $sidemenu = $container.find(".df-sidemenu");
        
        if ($sidemenu.length > 0) {
          const isCurrentlyOpen = $sidemenu.hasClass("df-sidemenu-visible");
          setIsThumbnailVisible(isCurrentlyOpen);
          console.log("✅ Toolbar ready - flipbook instance found, thumbnail state:", isCurrentlyOpen);
          
          // Ensure sidebar starts closed
          if (isCurrentlyOpen) {
            $sidemenu.removeClass("df-sidemenu-visible");
            setIsThumbnailVisible(false);
            console.log("✅ Thumbnail sidebar closed on initialization");
          }

          // Add page change listener to close sidebar when page changes
          if (flipbook.target && flipbook.target.updatePageCallback) {
            const originalCallback = flipbook.target.updatePageCallback;
            flipbook.target.updatePageCallback = function() {
              originalCallback.call(this);
              const $currentSidemenu = window.jQuery("#flipbookContainer").find(".df-sidemenu");
              if ($currentSidemenu.hasClass("df-sidemenu-visible")) {
                $currentSidemenu.removeClass("df-sidemenu-visible");
                setIsThumbnailVisible(false);
                console.log("✅ Thumbnail sidebar closed due to page change");
              }

              // Sync current page from target if available
              try {
                const target = flipbook.target || flipbook;
                const newPage = target?.currentPage || target?.currentPageNum || flipbook?.currentPage;
                const total = target?.totalPages || target?.pageCount || target?.pages?.length || flipbook?.totalPages;
                if (typeof newPage === "number") {
                  setCurrentPage(newPage);
                  setInputValue(String(newPage));
                }
                if (typeof total === "number") {
                  setTotalPages(total);
                }
              } catch (e) {
                // ignore
              }
            };
            console.log("✅ Page change listener added to close sidebar");
          }
        } else {
          console.log("⚠️ Sidemenu not found yet, will retry...");
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(checkReady, 300);
          }
        }
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(checkReady, 300);
      } else {
        console.warn("⚠️ Failed to initialize toolbar after maximum retries");
      }
    };
    
    // Start checking immediately
    setTimeout(checkReady, 500);
  }, []);

  // Robust page sync: poll current/total pages while ready
  useEffect(() => {
    if (!isReady) return;
    let rafId: number | null = null;
    let lastPage = currentPage;
    let lastTotal = totalPages;
    const tick = () => {
      try {
        const flipbook = (window as any).currentFlipbook;
        const target = flipbook?.target || flipbook;
        const newPage = target?.currentPage || target?.currentPageNum || flipbook?.currentPage;
        const newTotal = target?.totalPages || target?.pageCount || target?.pages?.length || flipbook?.totalPages;
        if (typeof newPage === "number" && newPage !== lastPage) {
          lastPage = newPage;
          setCurrentPage(newPage);
          setInputValue(String(newPage));
        }
        if (typeof newTotal === "number" && newTotal !== lastTotal) {
          lastTotal = newTotal;
          setTotalPages(newTotal);
        }
      } catch {}
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isReady]);
  // Function to trigger dFlip toolbar actions
  const triggerDFlipAction = (action: string) => {
    if (!isReady) {
      console.warn("Toolbar not ready yet. Please wait for initialization.");
      return;
    }

    // Check if jQuery is available
    if (!window.jQuery) {
      console.warn("jQuery not loaded yet");
      return;
    }

    // Get the global flipbook instance
    const flipbook = (window as any).currentFlipbook;
    
    if (!flipbook) {
      console.warn("Flipbook instance not found. Please wait for initialization.");
      return;
    }

    console.log("🎯 Executing action:", action, "on flipbook:", flipbook);
    
    try {
      executeAction(action, flipbook);
    } catch (error) {
      console.error("Error executing action:", action, error);
    }
  };

  // Helper to call the first available method path on the flipbook object
  const callMethod = (flipbook: any, methodPaths: string[], args: any[] = []) => {
    for (const path of methodPaths) {
      const parts = path.split(".");
      let ctx: any = flipbook;
      let fn: any = flipbook;
      for (let i = 0; i < parts.length; i++) {
        ctx = fn;
        fn = fn?.[parts[i]];
      }
      if (typeof fn === "function") {
        try {
          return fn.apply(ctx, args);
        } catch (e) {
          // try next
        }
      }
    }
    return undefined;
  };

  // Function to toggle thumbnail sidebar
  const toggleThumbnailSidebar = (flipbook: any) => {
    if (!window.jQuery) {
      console.warn("jQuery not available for thumbnail toggle");
      return;
    }

    const $container = window.jQuery("#flipbookContainer");
    const $sidemenu = $container.find(".df-sidemenu");
    
    if ($sidemenu.length === 0) {
      console.warn("No thumbnail sidebar elements found");
      return;
    }

    try {
      const isCurrentlyOpen = $sidemenu.hasClass("df-sidemenu-visible");
      
      if (isCurrentlyOpen) {
        $sidemenu.removeClass("df-sidemenu-visible");
        setIsThumbnailVisible(false);
        console.log("✅ Thumbnail sidebar closed");
      } else {
        $sidemenu.addClass("df-sidemenu-visible");
        setIsThumbnailVisible(true);
        
        // Ensure thumbnails are initialized
        if (flipbook.contentProvider?.initThumbs) {
          flipbook.contentProvider.initThumbs();
        }
        console.log("✅ Thumbnail sidebar opened");
      }
    } catch (error) {
      console.error("Error toggling thumbnail sidebar:", error);
    }
  };

  // Function to handle share action
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  // Separate function to execute the actual action
  const executeAction = (action: string, flipbook: any) => {
    switch (action) {
      case "zoomIn":
        if (flipbook.zoom) {
          flipbook.zoom(1);
          console.log("✅ Zoomed in");
        }
        break;
      case "zoomOut":
        if (flipbook.zoom) {
          flipbook.zoom(-1);
          console.log("✅ Zoomed out");
        }
        break;
      case "prevPage":
        callMethod(flipbook, ["prev", "previous", "api.prevPage", "target.prevPage", "ui.prev"]);
        break;
      case "nextPage":
        callMethod(flipbook, ["next", "api.nextPage", "target.nextPage", "ui.next"]);
        break;
      case "fitToScreen":
        if (flipbook.target && flipbook.target.fitToScreen) {
          flipbook.target.fitToScreen();
          console.log("✅ Fit to screen");
        }
        break;
      case "download":
        if (pdfUrl) {
          const link = document.createElement('a');
          link.href = pdfUrl;
          link.download = 'document.pdf';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          console.log("✅ Download initiated");
        }
        break;
      case "fullscreen":
        // Try dFlip methods first
        if (callMethod(flipbook, ["switchFullscreen", "ui.fullscreen", "target.switchFullscreen"]) !== undefined) {
          console.log("✅ Fullscreen toggled via dFlip");
          break;
        }
        // Fallback: use browser Fullscreen API on the container
        try {
          const container = document.getElementById("flipbookContainer");
          const isFs = !!document.fullscreenElement;
          if (!isFs) {
            (container as any)?.requestFullscreen?.();
          } else {
            (document as any).exitFullscreen?.();
          }
          console.log("✅ Fullscreen toggled via Web API");
        } catch (e) {
          console.error("Fullscreen not supported", e);
          toast.error("Fullscreen not supported in this browser");
        }
        break;
      case "grid":
        toggleThumbnailSidebar(flipbook);
        break;
      case "togglePageMode": {
        const target = flipbook.target || flipbook;
        if (!target) {
          console.warn("⚠️ Cannot toggle page mode: flipbook target missing.");
          break;
        }

        // dFlip constants: 1=SINGLE, 2=DOUBLE
        const currentlySingle = target.pageMode === 1;
        const newSingle = !currentlySingle;

        try {
          // Use UI helper if available (updates button state and resizes)
          if (flipbook.ui?.setPageMode) {
            flipbook.ui.setPageMode(newSingle);
          } else {
            // Fallback: set pageMode directly and resize
            target.pageMode = newSingle ? 1 : 2;
            
            // Try multiple methods to force refresh
            if (typeof flipbook.resize === "function") {
              flipbook.resize();
            }
            if (typeof target.resize === "function") {
              target.resize();
            }
            if (typeof target.refresh === "function") {
              target.refresh();
            }
            if (typeof flipbook.refresh === "function") {
              flipbook.refresh();
            }
          }

          setIsSinglePage(newSingle);
          console.log("✅ Page mode toggled to:", newSingle ? "single" : "double", "pageMode:", target.pageMode);
          toast.success(`Switched to ${newSingle ? "single" : "double"} page mode`);
        } catch (e) {
          console.error("Error toggling page mode", e);
          toast.error("Failed to toggle page mode");
        }
        break;
      }
      default:
        console.log(`Action ${action} not implemented`);
    }
  };

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReady) return;
    const flipbook = (window as any).currentFlipbook;
    const pageNum = parseInt(inputValue, 10);
    if (!flipbook || isNaN(pageNum) || pageNum < 1 || (totalPages && pageNum > totalPages)) {
      setInputValue(String(currentPage));
      return;
    }
    callMethod(flipbook, ["gotoPage", "api.gotoPage", "target.gotoPage"], [pageNum]);
  };

  return (
    <div className={`rounded-[1.5rem] bg-white/80 shadow-xl flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 backdrop-blur-sm ${!isReady ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Grid Icon */}
      <button 
        type="button" 
        className={`${isThumbnailVisible // --- USES LOCAL STATE ---
          ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500' 
          : 'bg-white hover:bg-gray-100 text-gray-600 border-gray-200'
        } rounded-full flex items-center justify-center w-9 h-9 transition-colors border`}
        title={isThumbnailVisible ? "Hide Thumbnails" : "Show Thumbnails"} // --- USES LOCAL STATE ---
        onClick={() => triggerDFlipAction("grid")}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      </button>
      {/* Fullscreen */}
      <button 
        type="button" 
        className={btnClass} 
        title="Fullscreen"
        onClick={() => triggerDFlipAction("fullscreen")}
      >
        <Fullscreen className={iconClass} />
      </button>
      {/* Prev Page */}
      <button 
        type="button" 
        className={btnClass} 
        title="Previous Page"
        onClick={() => triggerDFlipAction("prevPage")}
      >
        <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      {/* Plus/Zoom In Icon */}
      <button 
        type="button" 
        className={btnClass} 
        title="Zoom In"
        onClick={() => triggerDFlipAction("zoomIn")}
      >
        <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
      </button>
      {/* Minus/Zoom Out Icon */}
      <button 
        type="button" 
        className={btnClass} 
        title="Zoom Out"
        onClick={() => triggerDFlipAction("zoomOut")}
      >
        <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
      </button>
      {/* Page Input */}
      <form onSubmit={handlePageSubmit} className="flex items-center gap-1">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-12 h-8 text-center"
        />
        <span className="text-xs text-gray-500">/ {totalPages || "?"}</span>
      </form>
      {/* Next Page */}
      <button 
        type="button" 
        className={btnClass} 
        title="Next Page"
        onClick={() => triggerDFlipAction("nextPage")}
      >
        <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      {/* Fit/Center Icon */}
      <button 
        type="button" 
        className={btnClass} 
        title="Fit to Screen"
        onClick={() => triggerDFlipAction("fitToScreen")}
      >
        <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 0 0-2 2v4m0 6v4a2 2 0 0 0 2 2h4m6-16h4a2 2 0 0 1 2 2v4m0 6v4a2 2 0 0 1-2 2h-4"/></svg>
      </button>
      {/* Download Icon */}
      <button 
        type="button" 
        className={btnClass} 
        title="Download"
        onClick={() => triggerDFlipAction("download")}
      >
        <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </button>
      {/* Share Icon */}
      <button 
        type="button" 
        className={btnClass} 
        title="Share"
        onClick={handleShare}
      >
        <Share2 className={iconClass} />
      </button>

      {/* More Options Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            type="button" 
            className={btnClass} 
            title="More"
          >
            <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="mb-2 w-48" align="end">
          <DropdownMenuItem onClick={() => triggerDFlipAction("togglePageMode")}>
            <RectangleHorizontal className="w-4 h-4 mr-2" />
            <span>{isSinglePage ? "Show Double Page" : "Show Single Page"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default ViewerToolbar;
