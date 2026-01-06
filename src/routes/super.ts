
import { prisma } from '@/lib/db/prisma.js';
import { AuthUser, requireRole } from '@/lib/auth.js';
import { sendEmail, EMAIL_TEMPLATES } from '@/lib/email.js';
import { z } from 'zod';
import * as crypto from 'crypto';

const InviteSchema = z.object({ email: z.string().email(), role: z.enum(['ADMIN', 'SUPER_ADMIN']) });
const AdjustSchema = z.object({ agencyId: z.string().uuid(), type: z.enum(['CREDIT', 'DEBIT']), amount: z.number().positive(), reason: z.string().min(1) });
const SettingsSchema = z.object({ settings: z.array(z.object({ key: z.string(), value: z.string() })) });

export async function superRoutes(req: Request, path: string, user: AuthUser) {
    requireRole(user, ['SUPER_ADMIN']);
    const parts = path.split('/').filter(Boolean); // ["super", "admins", "invite"]
    const entity = parts[1];

    if (entity === 'admins') {
        if (parts[2] === 'invite' && req.method === 'POST') {
            const { email, role } = InviteSchema.parse(await req.json());
            if (await prisma.user.findUnique({ where: { email } })) return Response.json({ error: 'Exists' }, { status: 409 });
            const inviteToken = crypto.randomBytes(32).toString('hex');
            const pwd = crypto.randomBytes(16).toString('hex');
            const ph = await import('bcryptjs').then(m => m.hash(pwd, 10));

            const u = await prisma.user.create({ data: { email, role, password_hash: ph, resetToken: inviteToken, resetTokenExpiry: new Date(Date.now() + 86400000), email_verified: true } });
            await sendEmail({ to: email, subject: 'Invite', body: `<a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${inviteToken}">Join</a>` });
            await prisma.auditLog.create({ data: { actor_id: user.userId, action: 'ADMIN_INVITED', entity: 'USER', entity_id: u.id } });
            return Response.json({ success: true });
        }
        if (parts[2] === 'list' && req.method === 'GET') {
            const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } });
            return Response.json({ admins });
        }
    }

    if (entity === 'wallet' && parts[2] === 'adjust' && req.method === 'POST') {
        const { agencyId, type, amount, reason } = AdjustSchema.parse(await req.json());
        await prisma.$transaction(async (tx: any) => {
            const a = await tx.agency.findUnique({ where: { id: agencyId } });
            if (!a) throw new Error('Agency not found');
            if (type === 'DEBIT' && a.wallet_balance < amount) throw new Error('Insufficient funds');
            await tx.walletLedger.create({ data: { agency_id: agencyId, type, amount, reference_type: 'MANUAL_ADJUSTMENT', reference_id: user.userId } });
            await tx.agency.update({ where: { id: agencyId }, data: { wallet_balance: type === 'CREDIT' ? { increment: amount } : { decrement: amount } } });
            await tx.auditLog.create({ data: { actor_id: user.userId, action: `WALLET_ADJUST_${type}`, entity: 'WALLET', entity_id: agencyId } });
        });
        return Response.json({ success: true });
    }

    if (entity === 'system' && parts[2] === 'settings') {
        if (req.method === 'GET') {
            const settings = await prisma.systemSettings.findMany();
            return Response.json({ settings });
        }
        if (req.method === 'PUT') {
            const { settings } = SettingsSchema.parse(await req.json());
            await prisma.$transaction(async (tx: any) => {
                for (const s of settings) {
                    await tx.systemSettings.upsert({ where: { key: s.key }, update: { value: s.value }, create: { key: s.key, value: s.value } });
                }
                await tx.auditLog.create({ data: { actor_id: user.userId, action: 'SYSTEM_SETTINGS_UPDATED', entity: 'SYSTEM', entity_id: 'GLOBAL' } });
            });
            return Response.json({ success: true });
        }
    }

    if (entity === 'audit' && req.method === 'GET') {
        // Logic to list audit, but also Admin can access audit (handled in superRoutes? No, adminRoutes should handle if Admin access allowed)
        // But prompt said "Strong RBAC". Super logic in Super. Admin logic in Admin.
        // If Admin needs Audit, I should put it in Admin too OR shared.
        // I'll stick to Super only here.
        const logs = await prisma.auditLog.findMany({ orderBy: { created_at: 'desc' }, take: 100 });
        return Response.json({ logs });
    }

    return Response.json({ error: 'Not Found' }, { status: 404 });
}
