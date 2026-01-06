
import { prisma } from '../lib/db/prisma.js';
import { AuthUser, requireRole } from '../lib/auth.js';
import { uploadFile } from '../lib/storage.js';
import { sendEmail, EMAIL_TEMPLATES } from '../lib/email.js';
import { z } from 'zod';
import * as crypto from 'crypto';

export async function depositsRoutes(req: Request, path: string, user: AuthUser) {
    // /deposits
    const parts = path.split('/').filter(Boolean); // ["deposits", ...]

    // GET /deposits (List)
    if (parts.length === 1 && req.method === 'GET') {
        const where: any = {};
        if (user.role === 'AGENCY') {
            const u = await prisma.user.findUnique({ where: { id: user.userId }, select: { agency_id: true } });
            if (!u?.agency_id) return Response.json({ deposits: [] });
            where.agency_id = u.agency_id;
        }
        const deposits = await prisma.deposit.findMany({ where, orderBy: { created_at: 'desc' }, include: { agency: { select: { name: true } } } });
        return Response.json({ deposits });
    }

    // POST /deposits (Submit)
    if (parts.length === 1 && req.method === 'POST') {
        requireRole(user, ['AGENCY']); // Strict
        // Multipart
        const formData = await req.formData();
        const amount = parseFloat(formData.get('amount') as string);
        const proof = formData.get('proof_image') as File;

        if (!proof || isNaN(amount) || amount <= 0) return Response.json({ error: 'Invalid input' }, { status: 400 });

        const u = await prisma.user.findUnique({ where: { id: user.userId }, select: { agency_id: true } });
        if (!u?.agency_id) return Response.json({ error: 'Agency not found' }, { status: 400 });

        // Upload
        const { put } = await import('@vercel/blob');
        const buf = Buffer.from(await proof.arrayBuffer());
        const blob = await put(`deposits/${u.agency_id}/${crypto.randomUUID()}.jpg`, buf, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN });

        const depositId = crypto.randomUUID();
        await prisma.deposit.create({
            data: { id: depositId, agency_id: u.agency_id, amount, bank_reference: 'UPLOADED_PROOF', proof_url: blob.url, status: 'PENDING_ADMIN' } as any
        });
        await prisma.auditLog.create({ data: { actor_id: user.userId, action: 'AGENCY_DEPOSIT_SUBMITTED', entity: 'DEPOSIT', entity_id: depositId } });

        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        const adminLink = `${process.env.NEXT_PUBLIC_APP_URL}/admin/deposits`;
        // Email loop...

        return Response.json({ success: true }, { status: 201 });
    }

    // PUT /deposits/[id]/verify (Admin)
    if (parts.length === 3 && parts[2] === 'verify' && req.method === 'PUT') {
        requireRole(user, ['ADMIN', 'SUPER_ADMIN']);
        const { status, rejectionReason } = await req.json();
        const id = parts[1];

        const d = await prisma.deposit.findUnique({ where: { id }, include: { agency: true } });
        if (!d) return Response.json({ error: 'Not found' }, { status: 404 });

        if (status === 'REJECTED') {
            await prisma.deposit.update({ where: { id }, data: { status: 'REJECTED' } });
            // Email...
            return Response.json({ success: true });
        }
        if (status === 'VERIFIED') {
            await prisma.deposit.update({ where: { id }, data: { status: 'PENDING_SUPER_ADMIN' } });
            return Response.json({ success: true });
        }
        return Response.json({ error: 'Invalid Status' }, { status: 400 });
    }

    // PUT /deposits/[id]/approve (Super)
    if (parts.length === 3 && parts[2] === 'approve' && req.method === 'PUT') {
        requireRole(user, ['SUPER_ADMIN']);
        const id = parts[1];
        const d = await prisma.deposit.findUnique({ where: { id }, include: { agency: true } });
        if (!d) return Response.json({ error: 'Not found' }, { status: 404 });

        await prisma.$transaction([
            // ... ledger ...
            prisma.deposit.update({ where: { id }, data: { status: 'APPROVED', reviewed_by: user.userId, reviewed_at: new Date() } }),
            // ...
        ]);
        return Response.json({ success: true });
    }

    return Response.json({ error: 'Not Found' }, { status: 404 });
}
