import React, { useState, useEffect } from "react";

const iconClass = "w-6 h-6 text-gray-600";
const btnClass =
  "bg-white hover:bg-gray-100 rounded-full flex items-center justify-center w-12 h-12 transition-colors border border-gray-200";

interface ViewerToolbarProps {
  pdfUrl?: string;
}

function ViewerToolbar({ pdfUrl }: ViewerToolbarProps) {
  const [isReady, setIsReady] = useState(false);
  const [isThumbnailVisible, setIsThumbnailVisible] = useState(false);

  // Check if dFlip is ready and sync thumbnail state
  useEffect(() => {
    const checkReady = () => {
      if ((window as any).currentFlipbook) {
        setIsReady(true);
        
        // Check the actual state of the thumbnail sidebar
        if (window.jQuery) {
          const $container = window.jQuery("#flipbookContainer");
          const isCurrentlyOpen = $container.hasClass("df-sidemenu-open");
          setIsThumbnailVisible(isCurrentlyOpen);
          console.log("✅ Toolbar ready - flipbook instance found, thumbnail state:", isCurrentlyOpen);
          
          // If thumbnail is open, close it to start with closed state
          if (isCurrentlyOpen) {
            $container.removeClass("df-sidemenu-open");
            $container.find(".df-sidemenu").removeClass("df-sidemenu-visible");
            setIsThumbnailVisible(false);
            console.log("✅ Thumbnail sidebar closed on initialization");
          }
        }
      } else {
        // Check again after a short delay
        setTimeout(checkReady, 1000);
      }
    };
    
    // Start checking after a brief delay to allow initialization
    setTimeout(checkReady, 1000);
  }, []);
  // Function to trigger dFlip toolbar actions
  const triggerDFlipAction = (action: string) => {
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
    executeAction(action, flipbook);
  };

  // Function to toggle thumbnail sidebar
  const toggleThumbnailSidebar = (flipbook: any) => {
    if (!window.jQuery) {
      console.warn("jQuery not available for thumbnail toggle");
      return;
    }

    // Defensive: Record the current page before toggling
    let currentPage = flipbook.getCurrentPage ? flipbook.getCurrentPage() : (flipbook._activePage || 1);
    const $container = window.jQuery("#flipbookContainer");
    
    try {
      // Try to use the built-in thumbnail button first
      const thumbnailButton = $container.find(".df-ui-thumbnail");
      
      if (thumbnailButton.length > 0) {
        thumbnailButton.trigger("click");
        setTimeout(() => {
          const isCurrentlyOpen = $container.hasClass("df-sidemenu-open");
          setIsThumbnailVisible(isCurrentlyOpen);

          // Defensive: After the DOM has updated, forcibly restore the page if dflip changed it
          let newPage = flipbook.getCurrentPage ? flipbook.getCurrentPage() : (flipbook._activePage || 1);
          if (newPage !== currentPage && flipbook.gotoPage) {
            flipbook.gotoPage(currentPage);
          }
        }, 150);
        console.log("✅ Thumbnail sidebar toggled via built-in button");
        return;
      }

      // Fallback: Manual toggle using container classes
      const sidemenu = $container.find(".df-sidemenu");
      
      if (sidemenu.length > 0) {
        const isCurrentlyOpen = $container.hasClass("df-sidemenu-open");
        
        if (isCurrentlyOpen) {
          $container.removeClass("df-sidemenu-open");
          sidemenu.removeClass("df-sidemenu-visible");
        } else {
          $container.addClass("df-sidemenu-open");
          sidemenu.addClass("df-sidemenu-visible");
          
          // Ensure thumbnails are initialized
          if (flipbook.contentProvider?.initThumbs) {
            flipbook.contentProvider.initThumbs();
          }
        }
        
        // Update state after DOM changes
        setTimeout(() => {
          const newState = $container.hasClass("df-sidemenu-open");
          setIsThumbnailVisible(newState);
          // Defensive: Restore the page if changed
          let newPage = flipbook.getCurrentPage ? flipbook.getCurrentPage() : (flipbook._activePage || 1);
          if (newPage !== currentPage && flipbook.gotoPage) {
            flipbook.gotoPage(currentPage);
          }
        }, 150);
        console.log("✅ Thumbnail sidebar toggled manually");
      } else {
        console.warn("No thumbnail sidebar elements found");
      }
    } catch (error) {
      console.error("Error toggling thumbnail sidebar:", error);
    }
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
        if (flipbook.switchFullscreen) {
          flipbook.switchFullscreen();
          console.log("✅ Fullscreen toggled");
        }
        break;
      case "grid":
        toggleThumbnailSidebar(flipbook);
        break;
      default:
        console.log(`Action ${action} not implemented`);
    }
  };

  return (
    <div className={`rounded-[2rem] bg-white/80 shadow-xl flex items-center gap-4 px-4 py-2 backdrop-blur-sm ${!isReady ? 'opacity-50' : ''}`}>
      {/* Grid Icon */}
      <button 
        type="button" 
        className={`${isThumbnailVisible 
          ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500' 
          : 'bg-white hover:bg-gray-100 text-gray-600 border-gray-200'
        } rounded-full flex items-center justify-center w-12 h-12 transition-colors border`}
        title={isThumbnailVisible ? "Hide Thumbnails" : "Show Thumbnails"}
        onClick={() => triggerDFlipAction("grid")}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
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
      {/* More Icon */}
      <button 
        type="button" 
        className={btnClass} 
        title="More"
        onClick={() => triggerDFlipAction("fullscreen")}
      >
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
      </button>
    </div>
  );
}

export default ViewerToolbar;
