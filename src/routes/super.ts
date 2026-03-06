
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
        if (!parts[2] && req.method === 'GET') {
            const agencies = await prisma.agency.findMany({
                include: { users: { select: { name: true, email: true, last_login: true, active: true } } },
                orderBy: { created_at: 'desc' }
            });
            return Response.json({ agencies });
        }

        if (!parts[2] && req.method === 'POST') {
            const body = await req.json();
            const { companyName, ownerName, email, password, phone, type } = z.object({
                companyName: z.string().min(1),
                ownerName: z.string().min(1),
                email: z.string().email(),
                password: z.string().min(6),
                phone: z.string().optional(),
                type: z.string().default('Retail')
            }).parse(body);

            if (await prisma.agency.findUnique({ where: { email } })) return Response.json({ error: 'Agency email already in use' }, { status: 409 });
            if (await prisma.user.findUnique({ where: { email } })) return Response.json({ error: 'User email already in use' }, { status: 409 });

            const ph = await import('bcryptjs').then(m => m.hash(password, 10));

            const newAgency = await prisma.$transaction(async (tx: any) => {
                const a = await tx.agency.create({
                    data: { name: companyName, email, type, status: 'ACTIVE', verification_status: 'UNVERIFIED' }
                });

                await tx.user.create({
                    data: { agency_id: a.id, name: ownerName, email, password_hash: ph, role: 'AGENCY', active: true, email_verified: true }
                });

                await tx.auditLog.create({
                    data: { actor_id: user.userId, action: 'AGENCY_CREATED', entity: 'AGENCY', entity_id: a.id }
                });

                return a;
            });
            return Response.json({ success: true, agency: newAgency });
        }

        const agencyId = parts[2];
        const action = parts[3];

        if (agencyId && !action && req.method === 'PUT') {
            const body = await req.json();
            const { name, type, email } = z.object({
                name: z.string().min(1).optional(),
                type: z.string().optional(),
                email: z.string().email().optional()
            }).parse(body);

            await prisma.$transaction(async (tx: any) => {
                await tx.agency.update({ where: { id: agencyId }, data: { name, type, email } });
                await tx.auditLog.create({ data: { actor_id: user.userId, action: 'AGENCY_UPDATED', entity: 'AGENCY', entity_id: agencyId } });
            });
            return Response.json({ success: true });
        }

        if (agencyId && !action && req.method === 'DELETE') {
            await prisma.$transaction(async (tx: any) => {
                await tx.agency.update({ where: { id: agencyId }, data: { status: 'BLOCKED' } }); // Soft block
                const agencyUsers = await tx.user.findMany({ where: { agency_id: agencyId }, select: { id: true } });
                const userIds = agencyUsers.map((u: any) => u.id);
                if (userIds.length > 0) {
                    await tx.refreshToken.updateMany({ where: { user_id: { in: userIds } }, data: { revoked: true } });
                    // Also soft-delete the users associated directly
                    await tx.user.updateMany({ where: { agency_id: agencyId }, data: { active: false } });
                }
                await tx.auditLog.create({ data: { actor_id: user.userId, action: 'AGENCY_SOFT_DELETED', entity: 'AGENCY', entity_id: agencyId } });
            });
            return Response.json({ success: true });
        }

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

        if (action === 'kyc' && req.method === 'POST') {
            const { put } = await import('@vercel/blob');
            const formData = await req.formData();

            const fullName = formData.get('fullName') as string;
            const nationality = formData.get('nationality') as string;
            const idType = formData.get('idType') as string;
            const idNumber = formData.get('idNumber') as string;

            const licenseExpiryStr = formData.get('licenseExpiry') as string;
            const idExpiryStr = formData.get('idExpiry') as string;

            const businessDoc = formData.get('businessDoc') as File | null;
            const idFront = formData.get('idFront') as File | null;
            const idBack = formData.get('idBack') as File | null;
            const selfie = formData.get('selfie') as File | null;
            const passportDoc = formData.get('passportDoc') as File | null;

            if (!fullName || !idFront || !licenseExpiryStr) {
                return Response.json({ error: "Missing required fields" }, { status: 400 });
            }

            const licenseExpiryDate = new Date(licenseExpiryStr);
            const today = new Date();
            const diffTime = licenseExpiryDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 180) {
                return Response.json({ error: "License must be valid for at least 6 months" }, { status: 400 });
            }

            const uploadBlob = async (file: File | null, prefix: string) => {
                if (!file || file.size === 0) return null;
                const buf = Buffer.from(await file.arrayBuffer());
                const filename = `verification/${prefix}_${Date.now()}_${file.name}`;
                const blob = await put(filename, buf, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN });
                return { url: blob.url, thumbnailUrl: blob.url };
            };

            const businessUpload = await uploadBlob(businessDoc, 'business');
            const idFrontUpload = await uploadBlob(idFront, 'id_front');
            const idBackData = await uploadBlob(idBack, 'id_back');
            const selfieData = await uploadBlob(selfie, 'selfie');
            const passportData = await uploadBlob(passportDoc, 'passport');

            await prisma.$transaction(async (tx: any) => {
                if (businessUpload) {
                    await tx.verificationDocument.create({
                        data: {
                            agency_id: agencyId,
                            doc_type: 'TRADE_LICENSE',
                            file_url: businessUpload.url,
                            thumbnail_url: businessUpload.thumbnailUrl
                        }
                    });
                }

                const kyc = await tx.agencyOwnerKyc.create({
                    data: {
                        agencyId: agencyId,
                        fullName, nationality: nationality || 'Unknown', idType: idType || 'ID', idNumber: idNumber || 'Proxy-Upload',
                        idExpiry: idExpiryStr ? new Date(idExpiryStr) : new Date(licenseExpiryDate),
                        idFrontUrl: idFrontUpload?.url || '',
                        idFrontThumbnail: idFrontUpload?.thumbnailUrl,
                        idBackUrl: idBackData?.url,
                        idBackThumbnail: idBackData?.thumbnailUrl,
                        selfieUrl: selfieData?.url,
                        selfieThumbnail: selfieData?.thumbnailUrl,
                        passportUrl: passportData?.url,
                        licenseExpiryDate: licenseExpiryDate,
                        status: 'PENDING',
                        ocrStatus: 'PENDING'
                    }
                });

                await tx.agency.update({
                    where: { id: agencyId },
                    data: { verification_status: 'UNDER_REVIEW', kycWarningSentAt: null }
                });

                await tx.auditLog.create({
                    data: { actor_id: user.userId, action: 'PROXY_KYC_UPLOAD', entity: 'AGENCY', entity_id: agencyId }
                });
            });

            return Response.json({ success: true, message: "Proxy KYC Uploaded" });
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

        if (parts[2] === 'sync' && req.method === 'POST') {
            const { syncToursFromWordPress } = await import('../lib/sync.js');
            await syncToursFromWordPress();

            await prisma.auditLog.create({
                data: { actor_id: user.userId, action: 'MANUAL_TOUR_SYNC', entity: 'SYSTEM', entity_id: 'SYSTEM' }
            });
            return Response.json({ success: true, message: "Sync completed" });
        }

        const tourId = parts[2];
        const action = parts[3];

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

        if (!parts[2] && req.method === 'GET') {
            const admins = await prisma.user.findMany({
                where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
                select: { id: true, name: true, email: true, role: true, active: true, created_at: true, last_login: true }
            });
            return Response.json({ admins });
        }

        if (!parts[2] && req.method === 'POST') {
            const body = await req.json();
            const { name, email, password, role } = z.object({
                name: z.string().min(1),
                email: z.string().email(),
                password: z.string().min(6),
                role: z.enum(['ADMIN', 'SUPER_ADMIN']).default('ADMIN')
            }).parse(body);

            if (await prisma.user.findUnique({ where: { email } })) return Response.json({ error: 'Email already exists' }, { status: 409 });

            const ph = await import('bcryptjs').then(m => m.hash(password, 10));
            const newAdmin = await prisma.user.create({
                data: { name, email, role, password_hash: ph, email_verified: true, active: true }
            });
            await prisma.auditLog.create({ data: { actor_id: user.userId, action: 'ADMIN_CREATED', entity: 'USER', entity_id: newAdmin.id } });
            return Response.json({ success: true });
        }

        const adminId = parts[2];

        if (adminId && req.method === 'PUT') {
            const body = await req.json();
            const { name, email, active } = z.object({
                name: z.string().min(1).optional(),
                email: z.string().email().optional(),
                active: z.boolean().optional()
            }).parse(body);

            await prisma.$transaction(async (tx: any) => {
                await tx.user.update({ where: { id: adminId }, data: { name, email, active } });
                await tx.auditLog.create({ data: { actor_id: user.userId, action: 'ADMIN_UPDATED', entity: 'USER', entity_id: adminId } });

                if (active === false) {
                    await tx.refreshToken.updateMany({ where: { user_id: adminId }, data: { revoked: true } });
                }
            });
            return Response.json({ success: true });
        }

        if (adminId && req.method === 'DELETE') {
            await prisma.$transaction(async (tx: any) => {
                await tx.user.update({ where: { id: adminId }, data: { active: false } }); // Soft Delete 
                await tx.refreshToken.updateMany({ where: { user_id: adminId }, data: { revoked: true } });
                await tx.auditLog.create({ data: { actor_id: user.userId, action: 'ADMIN_DELETED', entity: 'USER', entity_id: adminId } });
            });
            return Response.json({ success: true });
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
