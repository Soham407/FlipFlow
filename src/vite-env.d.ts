/// <reference types="vite/client" />

declare global {
  interface Window {
    $: unknown;
    jQuery: unknown;
    
    // Flipbook global functions
    loadFlipbook: (
      url: string, 
      isSinglePage: boolean, 
      page: number, 
      pdfId: string
    ) => void;

    getLastPage: (pdfId: string) => Promise<number>;
  }
}

export {};
