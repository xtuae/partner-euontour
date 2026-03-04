import { IncomingMessage, ServerResponse } from 'http';
import { Readable } from 'stream';
import { authHandler } from "../src/lib/auth.js";
import { cors } from "../src/lib/cors.js";

// domain handlers
import { authRoutes } from "../src/routes/auth.js";
import { agencyRoutes } from "../src/routes/agency.js";
import { adminRoutes } from "../src/routes/admin.js";
import { superRoutes } from "../src/routes/super.js";
import { depositsRoutes } from "../src/routes/deposits.js";
import { bookingsRoutes } from "../src/routes/bookings.js";
import { walletRoutes } from "../src/routes/wallet.js";
import { filesRoutes } from "../src/routes/files.js";
import { webhookRoutes } from "../src/routes/webhooks.js";
import { notificationsRoutes } from "../src/routes/notifications.js";

export const config = {
    api: {
        bodyParser: false,
    },
};

// --- Web API Logic (Internal) ---
async function appHandler(req: Request): Promise<Response> {
    // 🔴 CORS FIRST — ALWAYS
    const corsResponse = cors(req);
    if (corsResponse && req.method === "OPTIONS") {
        return corsResponse;
    }

    const url = new URL(req.url);
    const path = url.pathname.replace("/api", "");

    let response: Response;

    if (path.startsWith("/auth")) {
        response = await authRoutes(req, path);
    } else if (path.startsWith("/webhooks")) {
        response = await webhookRoutes(req, path);
    } else if (path.startsWith("/cron/sync")) {
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            response = new Response('Unauthorized', { status: 401 });
        } else {
            const { syncToursFromWordPress } = await import('../src/lib/sync.js');
            try {
                await syncToursFromWordPress();
                response = Response.json({ success: true, message: "Sync completed via cron" });
            } catch (error: any) {
                console.error("Cron sync failed", error);
                response = Response.json({ success: false, error: 'Sync failed', details: error.message }, { status: 500 });
            }
        }
    } else {
        const user = await authHandler(req);

        if (!user) {
            response = new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            try {
                if (path.startsWith("/agency")) {
                    response = await agencyRoutes(req, path, user);
                } else if (path.startsWith("/admin")) {
                    response = await adminRoutes(req, path, user);
                } else if (path.startsWith("/super")) {
                    response = await superRoutes(req, path, user);
                } else if (path.startsWith("/deposits")) {
                    response = await depositsRoutes(req, path, user);
                } else if (path.startsWith("/bookings")) {
                    response = await bookingsRoutes(req, path, user);
                } else if (path.startsWith("/wallet")) {
                    response = await walletRoutes(req, path, user);
                } else if (path.startsWith("/files") || path.startsWith("/uploads")) {
                    response = await filesRoutes(req, path, user);
                } else if (path.startsWith("/notifications")) {
                    response = await notificationsRoutes(req, path, user);
                } else {
                    response = new Response("Not Found", { status: 404 });
                }
            } catch (err: any) {
                if (err.message === 'Forbidden') {
                    response = new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
                } else {
                    throw err;
                }
            }
        }
    }

    // 🔁 Ensure CORS headers on final response
    const origin = req.headers.get("origin");
    if (origin) {
        response.headers.set("Access-Control-Allow-Origin", origin);
        response.headers.set("Access-Control-Allow-Credentials", "true");
        response.headers.set("Vary", "Origin");
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
        // Write Response
        res.statusCode = webRes.status;

        // 2. Headers (collect cookies manually)
        const setCookies: string[] = [];

        webRes.headers.forEach((value, key) => {
            if (key.toLowerCase() === 'set-cookie') {
                setCookies.push(value);
            } else {
                res.setHeader(key, value);
            }
        });

        // 3. Apply cookies (array is REQUIRED for Node.js to send multiple Set-Cookie headers)
        if (setCookies.length > 0) {
            res.setHeader('set-cookie', setCookies);
        }

        // 4. Body
        const arrayBuffer = await webRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        res.end(buffer);

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
