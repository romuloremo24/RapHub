import 'dotenv/config';
import { crawlMercadoLibre } from './crawlers/mercadolibre.js';
import { crawlTocToc } from './crawlers/toctoc.js';
import { supabase } from './lib/supabase.js';

const source = process.argv[2];

async function run() {
  console.log(`Starting ${source} crawler...`);

  const { data: job } = await supabase.from('scraping_jobs').insert({
    source,
    job_type: 'full',
    status: 'running',
    started_at: new Date().toISOString(),
  }).select().single();

  try {
    let stats: { found: number; created: number; updated: number };

    if (source === 'mercadolibre') {
      stats = await crawlMercadoLibre();
    } else if (source === 'toctoc') {
      stats = await crawlTocToc();
    } else {
      throw new Error(`Unknown source: ${source}`);
    }

    if (job) {
      await supabase.from('scraping_jobs').update({
        status: 'completed',
        listings_found: stats.found,
        listings_new: stats.created,
        listings_updated: stats.updated,
        completed_at: new Date().toISOString(),
      }).eq('id', job.id);
    }

    console.log(`Done! Found: ${stats.found}, Created: ${stats.created}, Updated: ${stats.updated}`);
  } catch (err) {
    console.error('Crawler failed:', err);
    if (job) {
      await supabase.from('scraping_jobs').update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : String(err),
        completed_at: new Date().toISOString(),
      }).eq('id', job.id);
    }
    process.exit(1);
  }
}

run();
