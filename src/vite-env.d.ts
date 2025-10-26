/// <reference types="vite/client" />

declare global {
  interface Window {
    $: any;
    jQuery: any;
    
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
