import type { Source } from './property';

export interface ScrapingJob {
  id: string;
  source: Source;
  job_type: 'full' | 'incremental' | 'check';
  status: 'pending' | 'running' | 'completed' | 'failed';
  listings_found: number;
  listings_new: number;
  listings_updated: number;
  listings_deactivated: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}
