// In-memory rate limiter suitable for serverless/edge functions.
// Note: In a distributed Vercel Edge environment, this maps per-isolate.
// A more robust solution would use Redis (Upstash) but this satisfies the requirement without new infra.

interface RateLimitRecord {
    count: number;
    resetTime: number;
}

const store = new Map<string, RateLimitRecord>();

/**
 * Basic memory rate limiter.
 * @param ip IP Address of the requester
 * @param limit Max requests allowed in the window
 * @param windowMs Time window in milliseconds
 * @param prefix Cache key prefix
 * @returns boolean `true` if allowed, `false` if rate-limited.
 */
export function checkRateLimit(ip: string, limit: number, windowMs: number, prefix: string = 'global'): boolean {
    const key = `${prefix}:${ip}`;
    const now = Date.now();
    const record = store.get(key);

    if (!record) {
        store.set(key, { count: 1, resetTime: now + windowMs });
        return true;
    }

    if (now > record.resetTime) {
        store.set(key, { count: 1, resetTime: now + windowMs });
        return true;
    }

    if (record.count >= limit) {
        return false;
    }

    record.count += 1;
    return true;
}

/**
 * Standard security headers wrapper
 */
export function applySecurityHeaders(response: Response): Response {
    const headers = new Headers(response.headers);

    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-XSS-Protection', '1; mode=block');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
    });
}
