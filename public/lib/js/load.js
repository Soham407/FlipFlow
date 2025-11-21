// Function to load the flipbook
// NOW ACCEPTS 'containerElement' as the first argument
function loadFlipbook(containerElement, pdfUrl, rtlMode, page, pdfId) {
    var isRTL = rtlMode || false;  
    
    // Verify container exists immediately
    if (!containerElement) {
        console.error('❌ loadFlipbook: No container element provided');
        return;
    }

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
        initializeFlipbook(pdfUrl, isRTL, page, pdfId);
    });
    
    xhr.addEventListener('error', function() {
        console.error('Error loading PDF');
        initializeFlipbook(pdfUrl, isRTL, page, pdfId);
    });
    
    xhr.send();
    
    function initializeFlipbook(url, isRTL, page, pdfId) {
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
            direction: isRTL ? 2 : 1,
            allControls: "thumbnail",
            pageMode: isMobileDevice ? 1 : 2,
            enableSounds: true,
            webgl: true,
            controlsPosition: "none",
            enableThumbnail: true,
            autoEnableThumbnail: false,
            scrollWheel: false,
            zoomChange: function (isZoomed) {
                if (window.jQuery) {
                    window.jQuery("body").css("overflow", isZoomed ? "hidden" : "auto");
                }
            },
            openPage: page || 1,
            pdfId: pdfId || pdfUrl,
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

        if (window.jQuery) {
            // DIRECTLY WRAP THE DOM ELEMENT PASSED FROM REACT
            var $container = window.jQuery(containerElement);
            $container.empty();
            
            if (typeof $container.flipBook === 'function') {
                window.currentFlipbook = $container.flipBook(url, options);
                
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