import 'dotenv/config';

export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL_MOBILIARIO || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY_MOBILIARIO || '',
  },
  redis: {
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  },
  meli: {
    clientId: process.env.MELI_CLIENT_ID || '',
    clientSecret: process.env.MELI_CLIENT_SECRET || '',
    redirectUri: process.env.MELI_REDIRECT_URI || '',
    accessToken: process.env.MELI_ACCESS_TOKEN || '',
    refreshToken: process.env.MELI_REFRESH_TOKEN || '',
  },
  webhookSecret: process.env.SCRAPER_WEBHOOK_SECRET || '',
};
