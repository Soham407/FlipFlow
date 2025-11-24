import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileViewerToolbarProps {
  pdfUrl?: string;
}

const MobileViewerToolbar: React.FC<MobileViewerToolbarProps> = ({ pdfUrl }) => {
  const [isReady, setIsReady] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isSinglePage, setIsSinglePage] = useState(false);
  
  // ✨ NEW: State Machine for 4-Step Zoom Cycle
  const [zoomLevel, setZoomLevel] = useState<number>(0); // 0, 1, 2
  const [zoomDirection, setZoomDirection] = useState<1 | -1>(1); // 1 = In, -1 = Out
  
  const isMobile = useIsMobile();
  const appliedDefaultRef = useRef(false);

  // 1. Initialization Check
  useEffect(() => {
    let retries = 0;
    const max = 20;
    const check = () => {
      const flipbook = (window as any).currentFlipbook;
      if (flipbook) {
        setIsReady(true);
        try {
          const target = flipbook.target || flipbook;
          const cp = target?.currentPage || target?.currentPageNum || flipbook?.currentPage || 1;
          const tp = target?.totalPages || target?.pageCount || target?.pages?.length || flipbook?.totalPages || 0;
          const pm = target?.pageMode;
          setCurrentPage(typeof cp === "number" ? cp : 1);
          setTotalPages(typeof tp === "number" ? tp : 0);
          setIsSinglePage(pm === 1);
        } catch {}
      } else if (retries < max) {
        retries++;
        setTimeout(check, 300);
      }
    };
    setTimeout(check, 300);
  }, []);

  // 2. Page Sync
  useEffect(() => {
    if (!isReady) return;
    let rafId: number | null = null;
    let lastPage = -1;
    let lastTotal = -1;
    const tick = () => {
      try {
        const flipbook = (window as any).currentFlipbook;
        const target = flipbook?.target || flipbook;
        const np = target?.currentPage || target?.currentPageNum || flipbook?.currentPage;
        const tp = target?.totalPages || target?.pageCount || target?.pages?.length || flipbook?.totalPages;
        if (typeof np === "number" && np !== lastPage) {
          lastPage = np;
          setCurrentPage(np);
        }
        if (typeof tp === "number" && tp !== lastTotal) {
          lastTotal = tp;
          setTotalPages(tp);
        }
      } catch {}
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isReady]);

  // 3. Mobile Mode Enforcer
  useEffect(() => {
    if (!isReady || appliedDefaultRef.current) return;
    const flipbook = (window as any).currentFlipbook;
    if (!flipbook) return;
    try {
      const target = flipbook.target || flipbook;
      const desiredSingle = !!isMobile;
      const currentSingle = target?.pageMode === 1;
      if (currentSingle !== desiredSingle) {
        if (flipbook.ui?.setPageMode) {
          flipbook.ui.setPageMode(desiredSingle);
        } else {
          target.pageMode = desiredSingle ? 1 : 2;
          if (typeof target.resize === "function") target.resize();
          if (typeof flipbook.resize === "function") flipbook.resize();
        }
      }
      setIsSinglePage(desiredSingle);
      appliedDefaultRef.current = true;
    } catch {}
  }, [isReady, isMobile]);

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
        } catch {}
      }
    }
    return undefined;
  };

  const doAction = (
    action:
      | "prev"
      | "next"
      | "cycleZoom" // Renamed for clarity
      | "fullscreen"
      | "fitToScreen"
      | "togglePageMode"
      | "share"
      | "gotoPage"
  ) => {
    if (!isReady) return;
    const flipbook = (window as any).currentFlipbook;
    if (!flipbook) return;

    switch (action) {
      case "prev":
        callMethod(flipbook, ["prev", "previous", "api.prevPage", "target.prevPage", "ui.prev"]);
        break;
      case "next":
        callMethod(flipbook, ["next", "api.nextPage", "target.nextPage", "ui.next"]);
        break;
        
      // ✨ NEW: 4-Step Cycle Logic
      case "cycleZoom": {
        if (flipbook.zoom) {
          // 1. Execute the zoom based on current direction (1 = In, -1 = Out)
          flipbook.zoom(zoomDirection);
          
          // 2. Calculate where we just landed
          const nextLevel = zoomLevel + zoomDirection;
          setZoomLevel(nextLevel);

          // 3. Decide the direction for the NEXT click
          // If we hit Level 2 (Max), next click should be Out (-1)
          // If we hit Level 0 (Min), next click should be In (1)
          if (nextLevel >= 2) {
            setZoomDirection(-1);
            toast.info("Maximum zoom");
          } else if (nextLevel <= 0) {
            setZoomDirection(1);
            // Optional: Force a hard reset to be safe
            if (flipbook.target?.fitToScreen) flipbook.target.fitToScreen();
          }
        }
        break;
      }

      case "fitToScreen":
        if (flipbook.target?.fitToScreen) {
          flipbook.target.fitToScreen();
          // Reset our state machine manually
          setZoomLevel(0);
          setZoomDirection(1);
        }
        break;

      case "togglePageMode": {
        const target = flipbook.target || flipbook;
        const currentlySingle = target?.pageMode === 1;
        const newSingle = !currentlySingle;
        try {
          if (flipbook.ui?.setPageMode) {
            flipbook.ui.setPageMode(newSingle);
          } else {
            target.pageMode = newSingle ? 1 : 2;
            if (typeof flipbook.resize === "function") flipbook.resize();
          }
          setIsSinglePage(newSingle);
          toast.success(`Switched to ${newSingle ? "single" : "double"} page mode`);
        } catch {}
        break;
      }
      case "share": {
        const url = window.location.href;
        navigator.clipboard
          .writeText(url)
          .then(() => toast.success("Link copied!"))
          .catch(() => toast.error("Failed to copy link"));
        break;
      }
      case "gotoPage": {
        const input = window.prompt("Go to page #", String(currentPage));
        const pageNum = input ? parseInt(input, 10) : NaN;
        if (!isNaN(pageNum) && pageNum >= 1 && (!totalPages || pageNum <= totalPages)) {
          callMethod(flipbook, ["gotoPage", "api.gotoPage", "target.gotoPage"], [pageNum]);
        }
        break;
      }
    }
  };

  return (
    <div className={`rounded-2xl bg-white/90 shadow-xl flex items-center justify-between px-3 py-2 backdrop-blur-sm transition-all ${!isReady ? 'opacity-50 pointer-events-none' : ''}`}>
      
      {/* Left: Menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-700">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="py-6 rounded-t-[20px]">
          <div className="grid grid-cols-1 gap-3">
            <Button onClick={() => doAction("gotoPage")} variant="secondary" className="w-full justify-start px-4 h-12">
              Go to Page...
            </Button>
            <Button onClick={() => doAction("togglePageMode")} variant="secondary" className="w-full justify-start px-4 h-12">
              {isSinglePage ? "Switch to Double Page" : "Switch to Single Page"}
            </Button>
            <Button onClick={() => doAction("fitToScreen")} variant="secondary" className="w-full justify-start px-4 h-12">
              Reset View
            </Button>
            <Button onClick={() => doAction("share")} variant="secondary" className="w-full justify-start px-4 h-12">
              Share Link
            </Button>
            {pdfUrl && (
              <a href={pdfUrl} download className="w-full">
                <Button className="w-full justify-start px-4 h-12" variant="outline">Download PDF</Button>
              </a>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Center: Nav */}
      <div className="flex items-center bg-gray-100/80 rounded-full px-1 py-0.5 mx-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white" onClick={() => doAction("prev")}>
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </Button>
        <div className="text-xs font-medium text-gray-600 min-w-[50px] text-center select-none font-mono">
          {currentPage} / {totalPages || "--"}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white" onClick={() => doAction("next")}>
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </Button>
      </div>

      {/* Right: Dynamic Zoom Icon */}
      <Button 
        variant="ghost" 
        size="icon" 
        className={`h-9 w-9 transition-colors ${zoomLevel > 0 ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`} 
        onClick={() => doAction("cycleZoom")}
      >
        {/* If direction is IN (1), show Plus. If OUT (-1), show Minus */}
        {zoomDirection === 1 ? (
           // PLUS Icon (Next click will zoom IN)
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
           </svg>
        ) : (
           // MINUS Icon (Next click will zoom OUT)
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
           </svg>
        )}
      </Button>

    </div>
  );
};

export default MobileViewerToolbar;