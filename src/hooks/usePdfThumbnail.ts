import { useState, useEffect } from 'react';
import { getR2PublicUrl } from '@/lib/r2';

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

/**
 * Hook to generate a thumbnail from the first page of a PDF
 */
export function usePdfThumbnail(filePath: string | null, enabled: boolean = true) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !filePath) {
      setThumbnailUrl(null);
      return;
    }

    let isCancelled = false;
    const thumbnailCache = new Map<string, string>();

    const generateThumbnail = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check cache first
        const cached = thumbnailCache.get(filePath);
        if (cached) {
          if (!isCancelled) {
            setThumbnailUrl(cached);
            setLoading(false);
          }
          return;
        }

        // Wait for PDF.js to be available
        let retries = 0;
        while (typeof window.pdfjsLib === 'undefined' && retries < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }

        if (typeof window.pdfjsLib === 'undefined') {
          throw new Error('PDF.js not loaded');
        }

        const pdfUrl = getR2PublicUrl(filePath);
        
        // Load the PDF document
        const loadingTask = window.pdfjsLib.getDocument({
          url: pdfUrl,
          // Only load first page for performance
          disableAutoFetch: true,
          disableStream: false,
        });

        const pdf = await loadingTask.promise;
        
        if (isCancelled) return;

        // Get the first page
        const page = await pdf.getPage(1);
        
        if (isCancelled) return;

        // Set up canvas for rendering
        const viewport = page.getViewport({ scale: 0.5 }); // Scale down for thumbnail
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error('Could not get canvas context');
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render the page
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        if (isCancelled) return;

        // Convert canvas to blob URL
        canvas.toBlob((blob) => {
          if (!blob || isCancelled) return;
          
          const url = URL.createObjectURL(blob);
          thumbnailCache.set(filePath, url);
          
          if (!isCancelled) {
            setThumbnailUrl(url);
            setLoading(false);
          }
        }, 'image/jpeg', 0.85); // Use JPEG with 85% quality

      } catch (err) {
        if (!isCancelled) {
          console.error('Error generating PDF thumbnail:', err);
          setError(err instanceof Error ? err.message : 'Failed to generate thumbnail');
          setLoading(false);
        }
      }
    };

    generateThumbnail();

    return () => {
      isCancelled = true;
    };
  }, [filePath, enabled]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (thumbnailUrl && thumbnailUrl.startsWith('blob:')) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [thumbnailUrl]);

  return { thumbnailUrl, loading, error };
}
