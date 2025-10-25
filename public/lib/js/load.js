// Function to load the flipbook
function loadFlipbook(pdfUrl, rtlMode, page, pdfId) {
    var isRTL = rtlMode || false;  // Default to LTR
    var options = {
        height: "100%",
        duration: 700,
        backgroundColor: "#2F2D2F",
        direction: isRTL ? 2 : 1, // Use 2 for RTL and 1 for LTR
        
        // --- ADD THESE CONTROL OPTIONS ---
        allControls: "thumbnail",     // Enable thumbnail controls (was "none")
        pageMode: "double",           // Two-page book view
        enableSounds: true,            // Page turn sounds
        webgl: true,                  // 3D page-turning effects
        controlsPosition: "none",     // No built-in toolbar (we use custom React toolbar)
        enableThumbnail: true,        // Enable thumbnail functionality
        autoEnableThumbnail: false,   // Don't automatically open thumbnails
        scrollWheel: false,           // Disable mouse wheel zoom
        // ----------------------------------
        
        zoomChange: function (isZoomed) {
            // Ensure jQuery is loaded before using $
            if (window.jQuery) {
                window.jQuery("body").css("overflow", isZoomed ? "hidden" : "auto");
            }
        },
        openPage: page || 1,
        pdfId: pdfId || pdfUrl
    };

    // Ensure jQuery is loaded before using $
    if (window.jQuery) {
        var $container = window.jQuery("#flipbookContainer");
        $container.empty();
        
        // Check if the flipBook plugin exists
        if (typeof $container.flipBook === 'function') {
            // Store the flipbook instance globally so toolbar can access it
            window.currentFlipbook = $container.flipBook(pdfUrl, options);
            
            // Ensure thumbnail sidebar starts closed
            setTimeout(() => {
                $container.removeClass("df-sidemenu-open");
                $container.find(".df-sidemenu").removeClass("df-sidemenu-visible");
            }, 100);
            
            console.log("✅ Flipbook instance stored globally:", window.currentFlipbook);
        } else {
            console.error("dFlip flipBook function is not available on jQuery object.");
        }
    } else {
        console.error("jQuery is not loaded.");
    }
}

// 
// --- The $(document).ready() block has been completely removed. ---
// The React component will now be responsible for calling loadFlipbook.
//
