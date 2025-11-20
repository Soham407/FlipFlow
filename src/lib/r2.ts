/**
 * R2 Storage Utilities
 * 
 * Helper functions for working with Cloudflare R2 storage
 */

const R2_PUBLIC_BUCKET_URL = import.meta.env.VITE_R2_PUBLIC_URL || '';

/**
 * Get the public URL for a file stored in R2
 * 
 * @param filePath - The file path in R2 (e.g., "user_id/filename.pdf")
 * @returns The full public URL to access the file
 */
export const getR2PublicUrl = (filePath: string): string => {
  if (!filePath) {
    throw new Error('File path is required');
  }
  
  // Remove leading slash if present
  const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  
  return `${R2_PUBLIC_BUCKET_URL}/${cleanPath}`;
};

/**
 * Check if a URL is an R2 URL
 */
export const isR2Url = (url: string): boolean => {
  return url.includes('.r2.dev') || url.includes('.r2.cloudflarestorage.com');
};

/**
 * Extract the file path from an R2 URL
 */
export const extractR2FilePath = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    // Remove leading slash
    return urlObj.pathname.slice(1);
  } catch {
    return null;
  }
};
