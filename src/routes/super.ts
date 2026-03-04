
import { prisma } from '../lib/db/prisma.js';
import { AuthUser, requireRole } from '../lib/auth.js';
import { sendEmail, EMAIL_TEMPLATES } from '../lib/email.js';
import { z } from 'zod';
import * as crypto from 'crypto';

const InviteSchema = z.object({ email: z.string().email(), role: z.enum(['ADMIN', 'SUPER_ADMIN']) });
const AdjustSchema = z.object({ agencyId: z.string().uuid(), type: z.enum(['CREDIT', 'DEBIT']), amount: z.number().positive(), reason: z.string().min(1) });
const SettingsSchema = z.object({ settings: z.array(z.object({ key: z.string(), value: z.string() })) });

const StatusSchema = z.object({
    status: z.enum(['ACTIVE', 'SUSPENDED', 'BLOCKED'])
});
const KycSchema = z.object({
    action: z.enum(['APPROVE', 'REJECT']),
    reason: z.string().optional()
});
const SystemNotifySchema = z.object({ targetAgencyId: z.string().uuid(), title: z.string().min(1), message: z.string().min(1) });
const TourStatusSchema = z.object({ active: z.boolean() });

export async function superRoutes(req: Request, path: string, user: AuthUser) {
    requireRole(user, ['SUPER_ADMIN']);
    const parts = path.split('/').filter(Boolean); // ["super", "admins", "invite"]
    const entity = parts[1];

    if (entity === 'agencies') {
        const agencyId = parts[2];
        const action = parts[3];

        if (action === 'status' && req.method === 'PUT') {
            const { status } = StatusSchema.parse(await req.json());

            await prisma.$transaction(async (tx: any) => {
                await tx.agency.update({ where: { id: agencyId }, data: { status } });
                await tx.auditLog.create({
                    data: { actor_id: user.userId, action: `AGENCY_STATUS_${status}`, entity: 'AGENCY', entity_id: agencyId }
                });

                if (status === 'SUSPENDED' || status === 'BLOCKED') {
                    const agencyUsers = await tx.user.findMany({ where: { agency_id: agencyId }, select: { id: true } });
                    const userIds = agencyUsers.map((u: any) => u.id);
                    if (userIds.length > 0) {
                        await tx.refreshToken.updateMany({
                            where: { user_id: { in: userIds } },
                            data: { revoked: true }
                        });
                    }
                }
            });
            return Response.json({ success: true });
        }

        if (action === 'kyc' && req.method === 'PUT') {
            const { action: kycAction, reason } = KycSchema.parse(await req.json());
            const kyc = await prisma.agencyOwnerKyc.findFirst({ where: { agencyId }, orderBy: { createdAt: 'desc' }, include: { agency: true } });
            if (!kyc) return Response.json({ error: 'KYC Not Found' }, { status: 404 });

            if (kycAction === 'APPROVE') {
                await prisma.$transaction([
                    prisma.agencyOwnerKyc.update({ where: { id: kyc.id }, data: { status: 'VERIFIED' } }),
                    prisma.agency.update({ where: { id: agencyId }, data: { verification_status: 'VERIFIED' } }),
                    prisma.auditLog.create({ data: { actor_id: user.userId, action: 'APPROVE_KYC', entity: 'AGENCY_KYC', entity_id: kyc.id } })
                ]);
                await sendEmail({ to: kyc.agency.email, ...EMAIL_TEMPLATES.KYC_APPROVED_AGENCY(kyc.agency.name, `${process.env.NEXT_PUBLIC_APP_URL}/login`) });
            } else if (kycAction === 'REJECT') {
                await prisma.$transaction([
                    prisma.agencyOwnerKyc.update({ where: { id: kyc.id }, data: { status: 'REJECTED', rejectionReason: reason } }),
                    prisma.agency.update({ where: { id: agencyId }, data: { verification_status: 'REJECTED' } }),
                    prisma.auditLog.create({ data: { actor_id: user.userId, action: 'REJECT_KYC', entity: 'AGENCY_KYC', entity_id: kyc.id } })
                ]);
                await sendEmail({ to: kyc.agency.email, ...EMAIL_TEMPLATES.KYC_REJECTED_AGENCY(kyc.agency.name, reason || 'No reason provided', `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`) });
            }
            return Response.json({ success: true });
        }
    }

    if (entity === 'notify' && req.method === 'POST') {
        const { targetAgencyId, title, message } = SystemNotifySchema.parse(await req.json());
        const agency = await prisma.agency.findUnique({ where: { id: targetAgencyId } });
        if (!agency) return Response.json({ error: 'Agency not found' }, { status: 404 });

        await prisma.$transaction([
            prisma.notification.create({
                data: { agencyId: targetAgencyId, title, message }
            }),
            prisma.auditLog.create({
                data: { actor_id: user.userId, action: 'SYSTEM_NOTIFICATION_SENT', entity: 'AGENCY', entity_id: targetAgencyId }
            })
        ]);

        await sendEmail({ to: agency.email, subject: title, body: message });
        return Response.json({ success: true });
    }

    if (entity === 'tours') {
        if (parts.length === 2 && req.method === 'GET') {
            const tours = await prisma.tour.findMany({
                where: { deletedAt: null },
                orderBy: { name: 'asc' }
            });
            return Response.json({ tours });
        }

        const tourId = parts[2];
        const action = parts[3];

        if (action === 'sync' && req.method === 'POST') {
            const { syncToursFromWordPress } = await import('../lib/sync.js');
            await syncToursFromWordPress();

            await prisma.auditLog.create({
                data: { actor_id: user.userId, action: 'MANUAL_TOUR_SYNC', entity: 'SYSTEM', entity_id: 'SYSTEM' }
            });
            return Response.json({ success: true, message: "Sync completed" });
        }

        if (action === 'status' && req.method === 'PUT') {
            const { active } = TourStatusSchema.parse(await req.json());
            await prisma.$transaction(async (tx: any) => {
                await tx.tour.update({ where: { id: tourId }, data: { active } });
                await tx.auditLog.create({
                    data: { actor_id: user.userId, action: `TOUR_${active ? 'ENABLED' : 'DISABLED'}`, entity: 'TOUR', entity_id: tourId }
                });
            });
            return Response.json({ success: true });
        }

        if (req.method === 'DELETE' && !action) {
            await prisma.$transaction(async (tx: any) => {
                await tx.tour.update({ where: { id: tourId }, data: { deletedAt: new Date(), active: false } });
                await tx.auditLog.create({
                    data: { actor_id: user.userId, action: 'TOUR_SOFT_DELETED', entity: 'TOUR', entity_id: tourId }
                });
            });
            return Response.json({ success: true });
        }
    }

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
            await tx.walletLedger.create({ data: { agency_id: agencyId, type, amount, reference_type: 'MANUAL_ADJUSTMENT', reference_id: user.userId, description: reason } });
            await tx.agency.update({ where: { id: agencyId }, data: { wallet_balance: type === 'CREDIT' ? { increment: amount } : { decrement: amount } } });
            await tx.auditLog.create({ data: { actor_id: user.userId, action: `WALLET_ADJUST_${type}`, entity: 'WALLET', entity_id: agencyId } });
        });
        return Response.json({ success: true });
    }

    if (entity === 'finance' && parts[2] === 'ledger') {
        const agencyId = parts[3];
        if (req.method === 'GET') {
            const url = new URL(req.url);
            const skip = parseInt(url.searchParams.get('skip') || '0');
            const take = parseInt(url.searchParams.get('take') || '50');

            if (!agencyId) return Response.json({ error: 'Agency ID required' }, { status: 400 });

            const [ledger, total] = await Promise.all([
                prisma.walletLedger.findMany({
                    where: { agency_id: agencyId },
                    orderBy: { created_at: 'desc' },
                    skip,
                    take
                }),
                prisma.walletLedger.count({ where: { agency_id: agencyId } })
            ]);

            return Response.json({ ledger, total, skip, take });
        }
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
