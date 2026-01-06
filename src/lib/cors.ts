
const ALLOWED_ORIGINS = new Set([
    "https://partners.euontour.com",
    "https://partner-api.euontour.com",
    "http://localhost:5173",
]);

export function cors(req: Request): Response | null {
    const origin = req.headers.get("origin");

    // Always allow same-origin or non-browser calls
    if (!origin) return null;

    if (!ALLOWED_ORIGINS.has(origin)) {
        return new Response("CORS blocked", { status: 403 });
    }

    const headers = new Headers({
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers":
            "Content-Type, Authorization, X-Requested-With",
        "Vary": "Origin",
    });

    // 🚨 ABSOLUTE RULE: OPTIONS MUST RETURN HERE
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers });
    }

    return new Response(null, { headers });
}
