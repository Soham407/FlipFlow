/**
 * Shared type definitions for FlipFlow
 * Single source of truth for data structures across the application
 */

export interface Flipbook {
  id: string;
  user_id?: string;
  title: string;
  file_path: string;
  created_at: string;
  slug?: string;
  is_public?: boolean;
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

export type UserRole = 'free' | 'starter' | 'hobby' | 'business' | 'pro';
