import { IncomingMessage, ServerResponse } from 'http';
import { Readable } from 'stream';
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
    api: {
        bodyParser: false,
    },
};

// --- Web API Logic (Internal) ---
async function appHandler(req: Request): Promise<Response> {
    // 1️⃣ CORS FIRST (ALWAYS)
    const corsResponse = handleCors(req);
    // If it's an OPTIONS request, strictly return the CORS response (preflight)
    if (corsResponse && req.method === "OPTIONS") {
        return corsResponse;
    }

    // For non-OPTIONS, request processing continues...
    const url = new URL(req.url);
    const path = url.pathname.replace("/api", "");

    let response: Response;

    // Routing Logic
    if (path.startsWith("/auth")) {
        response = await authRoutes(req, path);
    } else if (path.startsWith("/agency") || path.startsWith("/admin") ||
        path.startsWith("/super") || path.startsWith("/deposits") ||
        path.startsWith("/bookings") || path.startsWith("/wallet") ||
        path.startsWith("/files") || path.startsWith("/uploads")) {

        // Auth check
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

    // 🔐 Merge CORS headers into response
    const origin = req.headers.get("origin");
    if (origin) {
        response.headers.set("Access-Control-Allow-Origin", origin);
        response.headers.set("Access-Control-Allow-Credentials", "true");
        // We can add others if needed, typically browsers need Access-Control-Allow-Methods/Headers for Preflight,
        // but for actual responses ACAO and ACAC are critical.
    }

    return response;
}

// --- Node.js Adapter (Vercel Entrypoint) ---
export default async function handler(req: IncomingMessage, res: ServerResponse) {
    try {
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;
        const url = new URL(req.url || '', `${protocol}://${host}`);

        // Construct Web Request
        const controller = new AbortController();
        const { method, headers } = req;
        const webHeaders = new Headers();
        for (const [key, value] of Object.entries(headers)) {
            if (Array.isArray(value)) {
                value.forEach(v => webHeaders.append(key, v));
            } else if (value) {
                webHeaders.set(key, value);
            }
        }

        const webReqInit: RequestInit = {
            method,
            headers: webHeaders,
            signal: controller.signal,
        };

        if (method !== 'GET' && method !== 'HEAD') {
            // Pass the raw stream as body (Node 18+ / Node 20+)
            // Vercel nodejs runtime supports ReadableStream but the type definition
            // for RequestInit might expect BodyInit. 
            // `req` is a Readable stream. In modern Node, we can pass it directly or use Readable.toWeb(req).
            // We cast to any to avoid TS mismatch if types are old, but runtime is Node 24.x per package.json.
            webReqInit.body = req as any;
            // Use "duplex: 'half'" for streaming bodies in Node fetch/Request
            (webReqInit as any).duplex = 'half';
        }

        const webReq = new Request(url, webReqInit);

        // Run Logic
        const webRes = await appHandler(webReq);

        // Write Response
        res.statusCode = webRes.status;
        webRes.headers.forEach((value, key) => {
            res.setHeader(key, value);
        });

        if (webRes.body) {
            const reader = webRes.body.getReader();
            // Pipe Web Stream to Node Response
            // Simplest is to iterate
            for await (const chunk of streamAsyncIterator(reader)) {
                res.write(chunk);
            }
        }
        res.end();

    } catch (e) {
        console.error('API Adapter Error:', e);
        res.statusCode = 500;
        res.end('Internal Server Error');
    }
}

// Helper to iterate readable stream
async function* streamAsyncIterator(reader: ReadableStreamDefaultReader<Uint8Array>) {
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) return;
            yield value;
        }
    } finally {
        reader.releaseLock();
    }
}
