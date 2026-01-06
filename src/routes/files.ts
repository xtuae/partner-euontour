
import { put } from '@vercel/blob';
// import { createSignedUrl } from '@vercel/blob';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/db/prisma.js';
import { AuthUser, requireRole } from '../lib/auth.js';

export async function filesRoutes(req: Request, path: string, user: AuthUser) {
    // path /files
    const parts = path.split('/').filter(Boolean); // ["files", ...]

    // GET /files/signed-url?path=...
    if (parts.length === 2 && parts[1] === 'signed-url' && req.method === 'GET') {
        requireRole(user, ['ADMIN', 'SUPER_ADMIN', 'AGENCY']); // Allow all auth roles?
        const url = new URL(req.url);
        const pathParam = url.searchParams.get('path');
        if (!pathParam) return Response.json({ error: 'Missing path' }, { status: 400 });

        // const signed = await createSignedUrl({ pathname: pathParam, expiresIn: 300, token: process.env.BLOB_READ_WRITE_TOKEN });
        // return Response.json({ url: signed });
        return Response.json({ error: 'Signed URL generation not supported in this environment' }, { status: 501 });
    }

    // POST /files/upload
    if (parts.length === 2 && parts[1] === 'upload' && req.method === 'POST') {
        requireRole(user, ['AGENCY', 'ADMIN', 'SUPER_ADMIN']);

        const formData = await req.formData();
        const file = formData.get("file") as File;
        const category = formData.get("category") as string;
        if (!file || !category) return Response.json({ error: 'Missing' }, { status: 400 });

        const buf = Buffer.from(await file.arrayBuffer());
        let blob;
        // ... compression logic ... (simplified for write)
        if (file.type.startsWith('image/')) {
            const compressed = await sharp(buf).rotate().resize({ width: 1600 }).jpeg({ quality: 75 }).toBuffer();
            blob = await put(`uploads/${category}/img-${randomUUID()}.jpg`, compressed, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN });
        } else {
            blob = await put(`uploads/${category}/${file.name}`, buf, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN });
        }

        await prisma.auditLog.create({ data: { actor_id: user.userId, action: 'UPLOAD', entity: 'FILE', entity_id: blob.url } });
        return Response.json({ url: blob.url });
    }

    return Response.json({ error: 'Not Found' }, { status: 404 });
}
