import type { VercelRequest } from '@vercel/node';

interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    };
}

const store: RateLimitStore = {};

/**
 * Basic in-memory rate limiter. 
 * Note: In a serverless environment like Vercel, this state is not shared across instances.
 * For production, use Redis (e.g. Vercel KV or Upstash).
 * 
 * @param req The request object
 * @param limit Max requests per window
 * @param windowMs Window size in milliseconds
 */
export function checkRateLimit(req: VercelRequest, limit: number = 10, windowMs: number = 60 * 1000): boolean {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    if (!store[ip]) {
        store[ip] = { count: 0, resetTime: now + windowMs };
    }

    if (now > store[ip].resetTime) {
        store[ip] = { count: 0, resetTime: now + windowMs };
    }

    store[ip].count += 1;

    return store[ip].count <= limit;
}
