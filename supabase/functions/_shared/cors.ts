export function buildCorsHeaders(origin: string | null, appUrl: string): Record<string, string> {
  let allowedOrigin = 'null';
  try {
    allowedOrigin = new URL(appUrl).origin;
  } catch {
    // Invalid deployment configuration must fail closed, not reflect the caller.
  }

  return {
    'Access-Control-Allow-Origin': origin === allowedOrigin ? origin : allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}
