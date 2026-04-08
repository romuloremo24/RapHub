import 'dotenv/config';
import { crawlMercadoLibre } from './crawlers/mercadolibre.js';
import { crawlTocToc } from './crawlers/toctoc.js';
import { supabase } from './lib/supabase.js';

async function runAll() {
  console.log('=== Starting all crawlers ===');

  for (const [name, fn] of [
    ['mercadolibre', crawlMercadoLibre],
    ['toctoc', crawlTocToc],
  ] as const) {
    console.log(`\n--- ${name} ---`);
    const { data: job } = await supabase.from('scraping_jobs').insert({
      source: name,
      job_type: 'full',
      status: 'running',
      started_at: new Date().toISOString(),
    }).select().single();

    try {
      const stats = await fn();
      if (job) {
        await supabase.from('scraping_jobs').update({
          status: 'completed',
          listings_found: stats.found,
          listings_new: stats.created,
          listings_updated: stats.updated,
          completed_at: new Date().toISOString(),
        }).eq('id', job.id);
      }
      console.log(`${name}: Found=${stats.found} New=${stats.created} Updated=${stats.updated}`);
    } catch (err) {
      console.error(`${name} failed:`, err);
      if (job) {
        await supabase.from('scraping_jobs').update({
          status: 'failed',
          error_message: err instanceof Error ? err.message : String(err),
          completed_at: new Date().toISOString(),
        }).eq('id', job.id);
      }
    }
  }

  console.log('\n=== All crawlers finished ===');
}

runAll();
