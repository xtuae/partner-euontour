
interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    };
}
const store: RateLimitStore = {};

export function checkRateLimit(req: Request, limit: number = 10, windowMs: number = 60 * 1000): boolean {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();

    if (!store[ip]) store[ip] = { count: 0, resetTime: now + windowMs };
    if (now > store[ip].resetTime) store[ip] = { count: 0, resetTime: now + windowMs };

    store[ip].count += 1;
    return store[ip].count <= limit;
}
