
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
    if (corsResponse) return corsResponse;

    const url = new URL(req.url);
    const path = url.pathname.replace("/api", ""); // e.g. /auth/login

    // 2️⃣ AUTH / PUBLIC ROUTES
    if (path.startsWith("/auth")) {
        return authRoutes(req, path);
    }

    // 3️⃣ PROTECTED ROUTES
    const user = await authHandler(req);
    if (!user) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (path.startsWith("/agency")) {
        return agencyRoutes(req, path, user);
    }

    if (path.startsWith("/admin")) {
        return adminRoutes(req, path, user);
    }

    if (path.startsWith("/super")) {
        return superRoutes(req, path, user);
    }

    if (path.startsWith("/deposits")) {
        return depositsRoutes(req, path, user);
    }

    if (path.startsWith("/bookings")) {
        return bookingsRoutes(req, path, user);
    }

    if (path.startsWith("/wallet")) {
        return walletRoutes(req, path, user);
    }

    if (path.startsWith("/files") || path.startsWith("/uploads")) {
        return filesRoutes(req, path, user);
    }

    return new Response("Not Found", { status: 404 });
}
