
import { authHandler } from "@/lib/auth.js";
import { handleCors } from "@/lib/cors.js";

// domain handlers
import { authRoutes } from "@/routes/auth.js";
import { agencyRoutes } from "@/routes/agency.js";
import { adminRoutes } from "@/routes/admin.js";
import { superRoutes } from "@/routes/super.js";
import { depositsRoutes } from "@/routes/deposits.js";
import { bookingsRoutes } from "@/routes/bookings.js";
import { walletRoutes } from "@/routes/wallet.js";
import { filesRoutes } from "@/routes/files.js";

export const config = {
    runtime: 'nodejs', // or 'edge' if preferred, but nodejs for crypto/sharp
};

export default async function handler(req: Request) {
    // 1️⃣ CORS FIRST (ALWAYS)
    const corsResponse = handleCors(req);
    // If it's an OPTIONS request, strictly return the CORS response (preflight)
    if (corsResponse && req.method === "OPTIONS") {
        return corsResponse;
    }

    // For non-OPTIONS, request processing continues...

    const url = new URL(req.url);
    const path = url.pathname.replace("/api", ""); // e.g. /auth/login

    let response: Response;

    // Routing Logic
    if (path.startsWith("/auth")) {
        response = await authRoutes(req, path);
    } else if (path.startsWith("/agency") || path.startsWith("/admin") ||
        path.startsWith("/super") || path.startsWith("/deposits") ||
        path.startsWith("/bookings") || path.startsWith("/wallet") ||
        path.startsWith("/files") || path.startsWith("/uploads")) {

        // Auth check for protected routes
        const user = await authHandler(req);
        if (!user) {
            response = new Response("Unauthorized", { status: 401 });
        } else {
            if (path.startsWith("/agency")) response = await agencyRoutes(req, path, user);
            else if (path.startsWith("/admin")) response = await adminRoutes(req, path, user);
            else if (path.startsWith("/super")) response = await superRoutes(req, path, user);
            else if (path.startsWith("/deposits")) response = await depositsRoutes(req, path, user);
            else if (path.startsWith("/bookings")) response = await bookingsRoutes(req, path, user);
            else if (path.startsWith("/wallet")) response = await walletRoutes(req, path, user);
            else if (path.startsWith("/files") || path.startsWith("/uploads")) response = await filesRoutes(req, path, user);
            else response = new Response("Not Found", { status: 404 });
        }
    } else {
        response = new Response("Not Found", { status: 404 });
    }

    // 🔐 Merge CORS headers into response (Step 3)
    const origin = req.headers.get("origin");
    if (origin) {
        response.headers.set("Access-Control-Allow-Origin", origin);
        response.headers.set("Access-Control-Allow-Credentials", "true");
        // Ensure other basic CORS headers are present if needed, but user snippet specifically asked for these two.
        // The handleCors helper had more in the OPTIONS response. 
        // We trust the browser keeps the preflight options for the actual request, 
        // but ACAO and ACAC allow the reading of the response.
    }

    return response;
}
