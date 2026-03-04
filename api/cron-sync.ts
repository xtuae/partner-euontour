import { syncToursFromWordPress } from '../src/lib/sync.js';

export default async function handler(request: Request) {
    if (request.method !== 'GET' && request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        await syncToursFromWordPress();
        return Response.json({ success: true, message: "Sync completed via cron" });
    } catch (error: any) {
        console.error("Cron sync failed", error);
        return Response.json({ success: false, error: 'Sync failed', details: error.message }, { status: 500 });
    }
}
