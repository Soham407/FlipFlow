// Function to load the flipbook
function loadFlipbook(pdfUrl, rtlMode, page, pdfId) {
    var isRTL = rtlMode || false;  // Default to LTR
    
    // Track PDF loading progress manually
    var xhr = new XMLHttpRequest();
    xhr.open('GET', pdfUrl, true);
    xhr.responseType = 'blob';
    
    xhr.addEventListener('progress', function(e) {
        if (e.lengthComputable) {
            var percentComplete = Math.round((e.loaded / e.total) * 100);
            if (typeof window.onPdfProgress === 'function') {
                window.onPdfProgress(percentComplete);
            }
        }
    });
    
    xhr.addEventListener('load', function() {
        // PDF download complete, now let dFlip render it
        initializeFlipbook(pdfUrl, isRTL, page, pdfId);
    });
    
    xhr.addEventListener('error', function() {
        console.error('Error loading PDF');
        // Still try to initialize in case the blob is available
        initializeFlipbook(pdfUrl, isRTL, page, pdfId);
    });
    
    xhr.send();
    
    function initializeFlipbook(url, isRTL, page, pdfId) {
    // Use React-provided mobile state (768px breakpoint) or fallback to 640px
    var isMobileDevice = false;
    if (typeof window.isMobileDevice !== 'undefined') {
        isMobileDevice = window.isMobileDevice;
    } else {
        try {
            isMobileDevice = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
        } catch (e) {
            isMobileDevice = (window.innerWidth || 0) < 768;
        }
    }

    var options = {
        height: "100%",
        duration: 700,
        backgroundColor: "#2F2D2F",
        direction: isRTL ? 2 : 1, // Use 2 for RTL and 1 for LTR
        
        // --- ADD THESE CONTROL OPTIONS ---
        allControls: "thumbnail",     // Enable thumbnail controls (was "none")
        pageMode: isMobileDevice ? 1 : 2, // 1=single on mobile, 2=double on desktop
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
        pdfId: pdfId || pdfUrl,
        
        // PDF Loading Progress Callbacks
        onReady: function() {
            console.log('✅ PDF is fully loaded');
            if (typeof window.onPdfReady === 'function') {
                window.onPdfReady();
            }
        },
        onProgress: function(progress) {
            if (typeof window.onPdfProgress === 'function') {
                window.onPdfProgress(progress);
            }
        }
    };

        // Ensure jQuery is loaded before using $
        if (window.jQuery) {
            var $container = window.jQuery("#flipbookContainer");
            $container.empty();
            
            // Check if the flipBook plugin exists
            if (typeof $container.flipBook === 'function') {
                // Store the flipbook instance globally so toolbar can access it
                window.currentFlipbook = $container.flipBook(url, options);
                
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
}

// 
// --- The $(document).ready() block has been completely removed. ---
// The React component will now be responsible for calling loadFlipbook.
//
