// Get allowed origins from environment variable, fallback to localhost for development
const ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [
  'http://localhost:5173', // Vite dev server
  'http://localhost:4173', // Vite preview
  'https://localhost:3000', // Alternative local dev
];

// Add production domain if available
const PRODUCTION_URL = Deno.env.get('PRODUCTION_URL');
if (PRODUCTION_URL) {
  ALLOWED_ORIGINS.push(PRODUCTION_URL);
}

export function getCorsHeaders(origin: string | null): Record<string, string> {
  // Check if the origin is allowed
  const isAllowedOrigin = origin && ALLOWED_ORIGINS.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-client-info, apikey',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

// Legacy export for compatibility - use getCorsHeaders() instead
export const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0], // Fallback to first allowed origin
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-client-info, apikey',
}; 