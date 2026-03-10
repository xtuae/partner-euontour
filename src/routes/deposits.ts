
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
        requireRole(user, ['AGENCY']);

        try {
            // 1. Check for Blob Token immediately
            if (!process.env.BLOB_READ_WRITE_TOKEN) {
                console.error('Missing BLOB_READ_WRITE_TOKEN');
                return Response.json({ error: 'Server configuration error' }, { status: 500 });
            }

            const formData = await req.formData();
            const amountRaw = formData.get('amount') as string;
            const proof = formData.get('proof_image') as File;
            const referenceNumber = formData.get('referenceNumber') as string || 'UPLOADED_PROOF';

            // 2. Safer number parsing
            const amount = parseFloat(amountRaw);

            if (!proof || isNaN(amount) || amount <= 0) {
                return Response.json({ error: 'Invalid input: Amount or Proof missing' }, { status: 400 });
            }

            const u = await prisma.user.findUnique({
                where: { id: user.userId },
                select: { agency_id: true, agency: { select: { name: true } } }
            });

            if (!u?.agency_id) return Response.json({ error: 'Agency not found' }, { status: 400 });

            // 3. Upload to Vercel Blob with Error Handling
            const { put } = await import('@vercel/blob');
            const buf = Buffer.from(await proof.arrayBuffer());
            const filename = `deposits/${u.agency_id}/${crypto.randomUUID()}.jpg`;

            const blob = await put(filename, buf, {
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN
            });

            const depositId = crypto.randomUUID();

            // 4. Database Write
            await prisma.deposit.create({
                data: {
                    id: depositId,
                    agency_id: u.agency_id,
                    amount: amount, // Prisma handles Decimal conversion if type matches
                    bank_reference: referenceNumber,
                    proof_url: blob.url,
                    status: 'PENDING_ADMIN'
                } as any
            });

            // 5. Audit Log
            await prisma.auditLog.create({
                data: {
                    actorId: user.userId, actorRole: 'UNKNOWN',
                    action: 'AGENCY_DEPOSIT_SUBMITTED',
                    entityType: 'DEPOSIT',
                    entityId: depositId
                }
            });

            // 6. Email Notification
            const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
            const adminLink = `${process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL}/#/admin/deposits`;

            await Promise.all(admins.map(admin =>
                sendEmail({
                    to: admin.email,
                    ...EMAIL_TEMPLATES.DEPOSIT_SUBMITTED_ADMIN(
                        u.agency?.name || 'Agency',
                        amount.toString(),
                        referenceNumber,
                        adminLink
                    )
                })
            ));

            return Response.json({ success: true }, { status: 201 });

        } catch (error) {
            console.error('Deposit Error:', error);
            return Response.json({ error: 'Failed to process deposit', details: String(error) }, { status: 500 });
        }
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

            // Email the agency owner
            const owner = await prisma.user.findFirst({ where: { agency_id: d.agency_id, role: 'AGENCY' } });
            if (owner) {
                await sendEmail({
                    to: owner.email,
                    subject: 'Deposit Rejected',
                    body: `<p>Your recent deposit of ${d.amount} has been rejected.</p><p>Reason: ${rejectionReason || 'No reason provided.'}</p>`
                });
            }
            return Response.json({ success: true });
        }
        if (status === 'VERIFIED') {
            await prisma.deposit.update({ where: { id }, data: { status: 'PENDING_SUPER_ADMIN' } });

            // Email Super Admins
            const superAdmins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN' } });
            const superLink = `${process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL}/#/super-admin/deposits`;
            await Promise.all(superAdmins.map(admin =>
                sendEmail({
                    to: admin.email,
                    ...EMAIL_TEMPLATES.DEPOSIT_VERIFIED_SUPER_ADMIN(
                        d.agency.name,
                        d.amount.toString(),
                        new Date().toISOString(),
                        superLink
                    )
                })
            ));

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

        const updatedAgency = await prisma.agency.findUnique({ where: { id: d.agency_id } });
        const updatedDeposit = await prisma.deposit.findUnique({ where: { id } });

        // Email the agency owner
        const owner = await prisma.user.findFirst({ where: { agency_id: d.agency_id, role: 'AGENCY' } });
        if (owner && updatedAgency && updatedDeposit) {
            await sendEmail({
                to: owner.email,
                ...EMAIL_TEMPLATES.DEPOSIT_APPROVED(
                    d.agency.name,
                    d.amount.toString(),
                    updatedAgency.wallet_balance.toString(),
                    updatedDeposit.reviewed_at?.toISOString() || new Date().toISOString()
                )
            });
        }

        return Response.json({ success: true });
    }

    return Response.json({ error: 'Not Found' }, { status: 404 });
}
