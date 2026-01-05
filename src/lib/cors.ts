import { VercelRequest, VercelResponse } from '@vercel/node';

// Allowed origins from environment variable or default fallback
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

// Fallback defaults if env var is empty (for local dev/preview)
if (ALLOWED_ORIGINS.length === 0) {
    ALLOWED_ORIGINS.push(
        'http://localhost:5173',
        'https://partner-euontour-xi.vercel.app'
    );
}

/**
 * Applies CORS headers to the response.
 * Returns true if the request was an OPTIONS preflight (and handled), false otherwise.
 */
export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
    const origin = req.headers.origin;

    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        // Fallback for tools or non-browser requests might not have origin, but better safe.
        // Or if origin is not allowed, we just don't set the header, effectively blocking it.
        // For development convenience with unknown local ports, we might historically allow localhost regex,
        // but user requested STRICT.
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return true;
    }

    return false;
}
