export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'premium';
  plan_expires_at: string | null;
  max_saved_searches: number;
  max_favorites: number;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  filters: import('./search').SearchFilters;
  frequency: 'instant' | 'daily' | 'weekly';
  is_active: boolean;
  last_notified_at: string | null;
  results_count: number;
  created_at: string;
}
