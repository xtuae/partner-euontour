
// Web API CORS Handler
const ALLOWED_ORIGINS = [
    "https://partners.euontour.com",
    "https://partner-api.euontour.com",
    "http://localhost:5173",
];

export function handleCors(req: Request): Response | null {
    const origin = req.headers.get("origin");

    // Strictly enforce allowed origins
    if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
        // Return 204 No Content for blocked origins as requested
        return new Response(null, { status: 204 });
    }

    const headers = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        "Vary": "Origin",
    };

    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers });
    }

    // For non-OPTIONS requests, return null to indicate processing should continue.
    // The headers will be attached in the main handler (api/index.ts).
    return null;
}
