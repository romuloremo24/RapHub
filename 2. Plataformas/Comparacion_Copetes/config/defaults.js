module.exports = {
  PORT: parseInt(process.env.PORT) || 3000,
  STORE_TIMEOUT: parseInt(process.env.STORE_TIMEOUT) || 65000,
  CRON_SCHEDULE: process.env.CRON_SCHEDULE || '0 6 * * *',
  CRON_TIMEZONE: process.env.CRON_TIMEZONE || 'America/Santiago',
  MAX_CONCURRENT_STORES: parseInt(process.env.MAX_CONCURRENT_STORES) || 5,
  RETRY_ATTEMPTS: parseInt(process.env.RETRY_ATTEMPTS) || 2,
  RETRY_DELAY_MS: parseInt(process.env.RETRY_DELAY_MS) || 3000,
  USER_AGENTS: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  ],
};
