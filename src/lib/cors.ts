
// Web API CORS Handler
export function handleCors(req: Request): Response | null {
    const origin = req.headers.get('Origin');
    const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '')
        .split(',')
        .map(o => o.trim())
        .filter(Boolean);

    // Fallback for local
    if (ALLOWED_ORIGINS.length === 0) {
        ALLOWED_ORIGINS.push('http://localhost:5173', 'https://partner-euontour-xi.vercel.app');
    }

    const headers = new Headers();

    // Methods
    headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');

    // Headers
    headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version'
    );
    headers.set('Access-Control-Allow-Credentials', 'true');

    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        headers.set('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
        // Non-browser requests: Allow? Or strictly separate?
        // Prompt says "CORS ... One place".
        // If no origin, likely server-to-server or tool.
        // We usually don't send CORS headers if no Origin.
    }

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
    }

    return null; // Continue, but caller might need headers?
    // Wait, the caller `api/index.ts` needs to append these headers to the ACTUAL response?
    // The user pattern:
    // `const corsResponse = handleCors(req); if (corsResponse) return corsResponse;`
    // This only handles OPTIONS.
    // What about actual responses? They need `Access-Control-Allow-Origin`.
    // My `handleCors` above returns `null` for non-OPTIONS.
    // The actual response logic in `index.ts` needs to apply headers.
    // Or I wrap the response?
    // Simplest approach: `corsHeaders(req): Headers` helper.
    // But user pattern implies `handleCors` handles the preflight.
    // I should provide a helper to append headers to Final Response.
}

export function getCorsHeaders(req: Request): Headers {
    const headers = new Headers();
    const origin = req.headers.get('Origin');
    const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
    if (ALLOWED_ORIGINS.length === 0) ALLOWED_ORIGINS.push('http://localhost:5173', 'https://partner-euontour-xi.vercel.app');

    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Access-Control-Allow-Credentials', 'true');
    }
    return headers;
}
