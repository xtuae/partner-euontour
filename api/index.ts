
import { authHandler } from "../src/lib/auth";
import { handleCors } from "../src/lib/cors";

// domain handlers
import { authRoutes } from "../src/routes/auth";
import { agencyRoutes } from "../src/routes/agency";
import { adminRoutes } from "../src/routes/admin";
import { superRoutes } from "../src/routes/super";
import { depositsRoutes } from "../src/routes/deposits";
import { bookingsRoutes } from "../src/routes/bookings";
import { walletRoutes } from "../src/routes/wallet";
import { filesRoutes } from "../src/routes/files";

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
