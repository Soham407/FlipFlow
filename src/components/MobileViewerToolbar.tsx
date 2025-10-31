import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

interface MobileViewerToolbarProps {
  pdfUrl?: string;
}

const MobileViewerToolbar: React.FC<MobileViewerToolbarProps> = ({ pdfUrl }) => {
  const [isReady, setIsReady] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);

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
          setCurrentPage(typeof cp === "number" ? cp : 1);
          setTotalPages(typeof tp === "number" ? tp : 0);

          if (flipbook.target && flipbook.target.updatePageCallback) {
            const original = flipbook.target.updatePageCallback;
            flipbook.target.updatePageCallback = function () {
              original.call(this);
              try {
                const target = flipbook.target || flipbook;
                const np = target?.currentPage || target?.currentPageNum || flipbook?.currentPage;
                const tp2 = target?.totalPages || target?.pageCount || target?.pages?.length || flipbook?.totalPages;
                if (typeof np === "number") setCurrentPage(np);
                if (typeof tp2 === "number") setTotalPages(tp2);
              } catch {}
            };
          }
        } catch {}
      } else if (retries < max) {
        retries++;
        setTimeout(check, 300);
      }
    };
    setTimeout(check, 300);
  }, []);

  // Robust page sync via rAF
  useEffect(() => {
    if (!isReady) return;
    let rafId: number | null = null;
    let lastPage = currentPage;
    let lastTotal = totalPages;
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

  const doAction = (action: "prev" | "next" | "zoomIn" | "zoomOut" | "fullscreen" | "grid") => {
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
      case "zoomIn":
        if (flipbook.zoom) flipbook.zoom(1);
        break;
      case "zoomOut":
        if (flipbook.zoom) flipbook.zoom(-1);
        break;
      case "fullscreen":
        if (callMethod(flipbook, ["switchFullscreen", "ui.fullscreen", "target.switchFullscreen"]) === undefined) {
          try {
            const container = document.getElementById("flipbookContainer");
            const isFs = !!document.fullscreenElement;
            if (!isFs) {
              (container as any)?.requestFullscreen?.();
            } else {
              (document as any).exitFullscreen?.();
            }
          } catch {}
        }
        break;
      case "grid":
        const $container = (window as any).jQuery?.("#flipbookContainer");
        const $sidemenu = $container?.find(".df-sidemenu");
        if ($sidemenu?.length) {
          if ($sidemenu.hasClass("df-sidemenu-visible")) {
            $sidemenu.removeClass("df-sidemenu-visible");
          } else {
            $sidemenu.addClass("df-sidemenu-visible");
            flipbook.contentProvider?.initThumbs?.();
          }
        }
        break;
    }
  };

  return (
    <div className={`rounded-2xl bg-white/90 shadow-xl flex items-center justify-between px-2 py-1.5 backdrop-blur-sm ${!isReady ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => doAction("prev")}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </Button>
        <div className="text-xs text-gray-700 min-w-[64px] text-center">
          {currentPage} / {totalPages || "?"}
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => doAction("next")}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </Button>
      </div>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Menu className="w-4 h-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="py-6">
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => doAction("zoomIn")} variant="secondary">Zoom In</Button>
            <Button onClick={() => doAction("zoomOut")} variant="secondary">Zoom Out</Button>
            <Button onClick={() => doAction("fullscreen")} variant="secondary">Fullscreen</Button>
            <Button onClick={() => doAction("grid")} variant="secondary">Thumbnails</Button>
            {pdfUrl && (
              <a href={pdfUrl} download className="col-span-2">
                <Button className="w-full" variant="outline">Download</Button>
              </a>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileViewerToolbar;


