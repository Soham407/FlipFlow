import { useState, useEffect } from "react";
import { Share2, RectangleHorizontal, Fullscreen } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { DflipInstance } from "@/types";

const iconClass = "w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600";
const btnClass =
  "bg-white hover:bg-gray-100 rounded-full flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 transition-colors border border-gray-200";

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
      const flipbook = window.currentFlipbook;

      if (flipbook && window.jQuery) {
        setIsReady(true);

        // Check initial page mode
        try {
          const target = flipbook.target || flipbook;
          const currentMode = target?.pageMode; // 1 = SINGLE, 2 = DOUBLE
          setIsSinglePage(currentMode === 1);

          // Initialize page state
          const initialCurrent =
            target?.currentPage ||
            target?.currentPageNum ||
            flipbook?.currentPage ||
            1;
          const initialTotal =
            target?.totalPages ||
            target?.pageCount ||
            target?.pages?.length ||
            flipbook?.totalPages ||
            0;

          if (typeof initialCurrent === "number") {
            setCurrentPage(initialCurrent);
            setInputValue(String(initialCurrent));
          }
          if (typeof initialTotal === "number") {
            setTotalPages(initialTotal);
          }
        } catch (e) {
          // Silent fail for initialization extras
        }

        // Sidebar sync logic
        const $container = window.jQuery("#flipbookContainer");
        const $sidemenu = $container.find(".df-sidemenu");

        if ($sidemenu.length > 0) {
          const isCurrentlyOpen = $sidemenu.hasClass("df-sidemenu-visible");
          setIsThumbnailVisible(isCurrentlyOpen);

          if (isCurrentlyOpen) {
            $sidemenu.removeClass("df-sidemenu-visible");
            setIsThumbnailVisible(false);
          }

          if (flipbook.target && flipbook.target.updatePageCallback) {
            const originalCallback = flipbook.target.updatePageCallback;
            flipbook.target.updatePageCallback = function () {
              originalCallback.call(this);
              const $currentSidemenu = window
                .jQuery("#flipbookContainer")
                .find(".df-sidemenu");
              if ($currentSidemenu.hasClass("df-sidemenu-visible")) {
                $currentSidemenu.removeClass("df-sidemenu-visible");
                setIsThumbnailVisible(false);
              }
            };
          }
        } else if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(checkReady, 300);
        }
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(checkReady, 300);
      }
    };

    setTimeout(checkReady, 500);
  }, []);

  // Polling for page updates
  useEffect(() => {
    if (!isReady) return;
    let rafId: number | null = null;
    let lastPage = -1;
    let lastTotal = -1;

    const tick = () => {
      try {
        const flipbook = window.currentFlipbook;
        const target = flipbook?.target || flipbook;

        const newPage =
          target?._activePage ||
          target?.currentPage ||
          target?.currentPageNum ||
          flipbook?._activePage ||
          flipbook?.currentPage ||
          flipbook?.pageNumber;

        const newTotal =
          target?.totalPages ||
          target?.pageCount ||
          target?.pages?.length ||
          flipbook?.totalPages;

        if (typeof newPage === "number" && newPage !== lastPage) {
          lastPage = newPage;
          setCurrentPage(newPage);
          setInputValue(String(newPage));
        }
        if (typeof newTotal === "number" && newTotal !== lastTotal) {
          lastTotal = newTotal;
          setTotalPages(newTotal);
        }
      } catch (e) {
        // Silent fail for polling
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isReady]);

  // Action Trigger Helper
  const triggerDFlipAction = (action: string) => {
    if (!isReady || !window.jQuery) return;
    const flipbook = window.currentFlipbook;
    if (!flipbook) return;

    executeAction(action, flipbook);
  };

  // Method Call Helper
  const callMethod = (
    flipbook: any,
    methodPaths: string[],
    args: any[] = []
  ) => {
    for (const path of methodPaths) {
      const parts = path.split(".");
      let ctx = flipbook;
      let fn = flipbook;
      for (let i = 0; i < parts.length; i++) {
        ctx = fn;
        fn = fn?.[parts[i]];
      }
      if (typeof fn === "function") {
        try {
          return fn.apply(ctx, args);
        } catch (e) {
          // Silent catch - method call error is non-critical
        }
      }
    }
  };

  const toggleThumbnailSidebar = (flipbook: DflipInstance) => {
    const $container = window.jQuery("#flipbookContainer");
    const $sidemenu = $container.find(".df-sidemenu");
    if ($sidemenu.length === 0) return;

    const isCurrentlyOpen = $sidemenu.hasClass("df-sidemenu-visible");
    if (isCurrentlyOpen) {
      $sidemenu.removeClass("df-sidemenu-visible");
      setIsThumbnailVisible(false);
    } else {
      $sidemenu.addClass("df-sidemenu-visible");
      setIsThumbnailVisible(true);
      if (flipbook.contentProvider?.initThumbs) {
        flipbook.contentProvider.initThumbs();
      }
    }
  };

  const handleShare = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => toast.success("Link copied to clipboard!"))
      .catch(() => toast.error("Failed to copy link"));
  };

  const executeAction = (action: string, flipbook: DflipInstance) => {
    switch (action) {
      case "zoomIn":
        if (flipbook.zoom) flipbook.zoom(1);
        break;
      case "zoomOut":
        if (flipbook.zoom) flipbook.zoom(-1);
        break;
      case "prevPage":
        callMethod(flipbook, [
          "prev",
          "previous",
          "api.prevPage",
          "target.prevPage",
          "ui.prev",
        ]);
        break;
      case "nextPage":
        callMethod(flipbook, [
          "next",
          "api.nextPage",
          "target.nextPage",
          "ui.next",
        ]);
        break;
      case "fitToScreen":
        if (flipbook.target?.fitToScreen) {
          flipbook.target.fitToScreen();
          // Force resize to reset zoom/layout
          if (flipbook.resize) flipbook.resize();
        }
        break;
      case "download":
        if (pdfUrl) {
          const link = document.createElement("a");
          link.href = pdfUrl;
          link.download = "document.pdf";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        break;
      case "fullscreen":
        if (
          callMethod(flipbook, [
            "switchFullscreen",
            "ui.fullscreen",
            "target.switchFullscreen",
          ]) === undefined
        ) {
          const container = document.getElementById("flipbookContainer");
          if (!document.fullscreenElement) {
            (container as any)?.requestFullscreen?.();
          } else {
            (document as any).exitFullscreen?.();
          }
        }
        break;
      case "grid":
        toggleThumbnailSidebar(flipbook);
        break;
      case "togglePageMode": {
        const target = flipbook.target || flipbook;
        if (!target) break;
        const newSingle = !(target.pageMode === 1);

        if (flipbook.ui?.setPageMode) {
          flipbook.ui.setPageMode(newSingle);
        } else {
          target.pageMode = newSingle ? 1 : 2;
          if (flipbook.resize) flipbook.resize();
        }
        setIsSinglePage(newSingle);
        toast.success(
          `Switched to ${newSingle ? "single" : "double"} page mode`
        );
        break;
      }
    }
  };

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReady) return;
    const flipbook = window.currentFlipbook;
    const pageNum = parseInt(inputValue, 10);
    if (
      !flipbook ||
      isNaN(pageNum) ||
      pageNum < 1 ||
      (totalPages && pageNum > totalPages)
    ) {
      setInputValue(String(currentPage));
      return;
    }
    callMethod(
      flipbook,
      ["gotoPage", "api.gotoPage", "target.gotoPage"],
      [pageNum]
    );
  };

  // UPDATED: Fixed positioning at bottom center for ALL screens
  return (
    <div
      className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 
      rounded-[1.5rem] bg-background/95 dark:bg-background/90 shadow-2xl border border-border
      flex items-center gap-2 px-3 py-2 
      backdrop-blur-md transition-all duration-300 ease-in-out
      ${
        !isReady
          ? "opacity-50 translate-y-10 pointer-events-none"
          : "opacity-100 translate-y-0"
      }
    `}
      role="toolbar"
      aria-label="Flipbook controls"
    >
      {/* Grid Icon */}
      <button
        type="button"
        className={`${
          isThumbnailVisible
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-transparent hover:bg-muted text-foreground"
        } rounded-full flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 transition-colors`}
        aria-label={isThumbnailVisible ? "Hide Thumbnails" : "Show Thumbnails"}
        aria-pressed={isThumbnailVisible}
        onClick={() => triggerDFlipAction("grid")}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      </button>

      <div className="h-4 w-px bg-gray-200 mx-1" />

      {/* Navigation Group */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={btnClass}
          title="Previous Page"
          onClick={() => triggerDFlipAction("prevPage")}
        >
          <svg
            className={iconClass}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Page Input */}
        <form onSubmit={handlePageSubmit} className="flex items-center mx-1">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-12 h-8 text-center text-sm px-1 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
          />
          <span className="text-xs text-gray-500 font-medium ml-1.5 w-max">
            / {totalPages || "--"}
          </span>
        </form>

        <button
          type="button"
          className={btnClass}
          title="Next Page"
          onClick={() => triggerDFlipAction("nextPage")}
        >
          <svg
            className={iconClass}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="h-4 w-px bg-gray-200 mx-1" />

      {/* Zoom Group */}
      <div className="flex items-center gap-1 hidden sm:flex">
        <button
          type="button"
          className={btnClass}
          onClick={() => triggerDFlipAction("zoomOut")}
        >
          <svg
            className={iconClass}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </button>
        <button
          type="button"
          className={btnClass}
          onClick={() => triggerDFlipAction("zoomIn")}
        >
          <svg
            className={iconClass}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </button>
      </div>

      {/* Actions Group */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={btnClass}
          onClick={() => triggerDFlipAction("fitToScreen")}
          title="Fit to Screen"
        >
          <svg
            className={iconClass}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path d="M9 3H5a2 2 0 0 0-2 2v4m0 6v4a2 2 0 0 0 2 2h4m6-16h4a2 2 0 0 1 2 2v4m0 6v4a2 2 0 0 1-2 2h-4" />
          </svg>
        </button>

        <button
          type="button"
          className={btnClass}
          onClick={() => triggerDFlipAction("fullscreen")}
          title="Fullscreen"
        >
          <Fullscreen className={iconClass} />
        </button>

        {/* Dropdown for extras */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={btnClass} title="More">
              <svg
                className={iconClass}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="mb-4 w-56"
            align="center"
            sideOffset={10}
          >
            <DropdownMenuItem
              onClick={() => triggerDFlipAction("togglePageMode")}
            >
              <RectangleHorizontal className="w-4 h-4 mr-2" />
              <span>
                {isSinglePage
                  ? "Switch to Double Page"
                  : "Switch to Single Page"}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => triggerDFlipAction("download")}>
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download PDF</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              <span>Share Link</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default ViewerToolbar;
