import { VercelRequest, VercelResponse } from '@vercel/node';

// Allowed origins
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://partner-euontour.vercel.app',
    'https://partner-euontour-xi.vercel.app' // Production URL (Implicit)
];

/**
 * Applies CORS headers to the response.
 * Returns true if the request was an OPTIONS preflight (and handled), false otherwise.
 */
export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
    const origin = req.headers.origin;

    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        // Fallback for development if needed, or strict 'null'
        // For security, strict matching is better, but for debugging let's allow non-browser tools or undefined origins often used by curl if needed, but here we focus on browser.
        // If no origin header (like curl), we don't set AC-Allow-Origin usually, or set *.
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return true;
    }

    return false;
}
