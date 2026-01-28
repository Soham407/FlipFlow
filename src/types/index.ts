/**
 * Shared type definitions for FlipFlow
 * Single source of truth for data structures across the application
 */

export interface Flipbook {
  id: string;
  user_id?: string;
  title: string;
  pdf_storage_path: string;
  created_at: string;
  slug?: string;
  is_public?: boolean;
  is_locked?: boolean;
  lock_reason?: string | null;
  view_count?: number;
  file_size?: number;
  status?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface ViewEvent {
  id: string;
  flipbook_id: string;
  user_id: string | null;
  viewed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  time_spent_seconds?: number | null;
  session_id?: string | null;
}

export type UserRole = "free" | "starter" | "hobby" | "business" | "pro";

// Dflip Flipbook types
export interface DflipInstance {
  target?: any;
  ui?: {
    setPageMode?: (single: boolean) => void;
  };
  currentPage?: number;
  _activePage?: number;
  totalPages?: number;
  pageNumber?: number;
  pageCount?: number;
  zoom?: (delta: number) => void;
  resize?: () => void;
  dispose?: () => void;
  prev?: () => void;
  next?: () => void;
  gotoPage?: (page: number) => void;
  switchFullscreen?: () => void;
  fullscreen?: () => void;
  contentProvider?: {
    initThumbs?: () => void;
  };
}

export interface DflipOptions {
  pageMode?: 1 | 2;
  singlePageMode?: boolean;
  webgl?: boolean;
  height?: string;
  duration?: number;
  autoPageMode?: boolean;
  [key: string]: any;
}

declare global {
  interface Window {
    currentFlipbook?: DflipInstance;
    loadFlipbook?: (
      element: HTMLElement,
      url: string,
      rtl: boolean,
      startPage: number,
      id: string
    ) => void;
    getLastPage?: (id: string) => Promise<number>;
    onPdfProgress?: (progress: number) => void;
    onPdfReady?: () => void;
    jQuery?: any;
    $?: any;
  }
}
