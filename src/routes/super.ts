
import { prisma } from '../lib/db/prisma.js';
import { AuthUser, requireRole } from '../lib/auth.js';
import { sendEmail, EMAIL_TEMPLATES } from '../lib/email.js';
import { stripe } from '../lib/stripe.js';
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

    if (entity === 'analytics' && req.method === 'GET') return handleAnalytics(req, user);
    if (entity === 'logs' && req.method === 'GET') return handleAuditLogs(req, user);

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
                    data: { actorId: user.userId, actorRole: 'UNKNOWN', action: 'AGENCY_CREATED', entityType: 'AGENCY', entityId: a.id }
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
                await tx.auditLog.create({ data: { actorId: user.userId, actorRole: 'UNKNOWN', action: 'AGENCY_UPDATED', entityType: 'AGENCY', entityId: agencyId } });
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
                await tx.auditLog.create({ data: { actorId: user.userId, actorRole: 'UNKNOWN', action: 'AGENCY_SOFT_DELETED', entityType: 'AGENCY', entityId: agencyId } });
            });
            return Response.json({ success: true });
        }

        if (action === 'status' && req.method === 'PUT') {
            const { status } = StatusSchema.parse(await req.json());

            await prisma.$transaction(async (tx: any) => {
                await tx.agency.update({ where: { id: agencyId }, data: { status } });
                await tx.auditLog.create({
                    data: { actorId: user.userId, actorRole: 'UNKNOWN', action: `AGENCY_STATUS_${status}`, entityType: 'AGENCY', entityId: agencyId }
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

        if (action === 'wallet' && parts[4] === 'credit' && req.method === 'POST') {
            const body = await req.json();
            const { amount, reference, notes } = z.object({
                amount: z.number().positive(),
                reference: z.string().optional(),
                notes: z.string().optional()
            }).parse(body);

            await prisma.$transaction(async (tx) => {
                await tx.agency.update({
                    where: { id: agencyId },
                    data: { wallet_balance: { increment: amount } }
                });

                await tx.walletLedger.create({
                    data: {
                        agency_id: agencyId,
                        type: 'CREDIT',
                        amount,
                        reference_type: 'MANUAL_DEPOSIT',
                        reference_id: reference || 'SUPER_ADMIN_PROXY',
                        description: notes || 'Manual credit by Super Admin'
                    }
                });

                await tx.auditLog.create({
                    data: {
                        actorId: user.userId,
                        actorRole: 'SUPER_ADMIN',
                        action: 'MANUAL_WALLET_CREDIT',
                        entityType: 'AGENCY',
                        entityId: agencyId,
                        details: { amount, notes }
                    }
                });
            });

            return Response.json({ success: true, message: `Credited €${amount} to agency wallet` });
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
                    data: { actorId: user.userId, actorRole: 'UNKNOWN', action: 'PROXY_KYC_UPLOAD', entityType: 'AGENCY', entityId: agencyId }
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
            prisma.appNotification.create({
                data: { agencyId: targetAgencyId, title, message }
            }),
            prisma.auditLog.create({
                data: { actorId: user.userId, actorRole: 'UNKNOWN', action: 'SYSTEM_NOTIFICATION_SENT', entityType: 'AGENCY', entityId: targetAgencyId }
            })
        ]);

        await sendEmail({ to: agency.email, subject: title, body: message }).catch(() => null);
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
                data: { actorId: user.userId, actorRole: 'UNKNOWN', action: 'MANUAL_TOUR_SYNC', entityType: 'SYSTEM', entityId: 'SYSTEM' }
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
                    data: { actorId: user.userId, actorRole: 'UNKNOWN', action: `TOUR_${active ? 'ENABLED' : 'DISABLED'}`, entityType: 'TOUR', entityId: tourId }
                });
            });
            return Response.json({ success: true });
        }

        if (req.method === 'DELETE' && !action) {
            await prisma.$transaction(async (tx: any) => {
                await tx.tour.update({ where: { id: tourId }, data: { deletedAt: new Date(), active: false } });
                await tx.auditLog.create({
                    data: { actorId: user.userId, actorRole: 'UNKNOWN', action: 'TOUR_SOFT_DELETED', entityType: 'TOUR', entityId: tourId }
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
            await prisma.auditLog.create({ data: { actorId: user.userId, actorRole: 'UNKNOWN', action: 'ADMIN_INVITED', entityType: 'USER', entityId: u.id } });
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
            await prisma.auditLog.create({ data: { actorId: user.userId, actorRole: 'UNKNOWN', action: 'ADMIN_CREATED', entityType: 'USER', entityId: newAdmin.id } });
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
                await tx.auditLog.create({ data: { actorId: user.userId, actorRole: 'UNKNOWN', action: 'ADMIN_UPDATED', entityType: 'USER', entityId: adminId } });

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
                await tx.auditLog.create({ data: { actorId: user.userId, actorRole: 'UNKNOWN', action: 'ADMIN_DELETED', entityType: 'USER', entityId: adminId } });
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
            await tx.auditLog.create({ data: { actorId: user.userId, actorRole: 'UNKNOWN', action: `WALLET_ADJUST_${type}`, entityType: 'WALLET', entityId: agencyId } });
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
                await tx.auditLog.create({ data: { actorId: user.userId, actorRole: 'UNKNOWN', action: 'SYSTEM_SETTINGS_UPDATED', entityType: 'SYSTEM', entityId: 'GLOBAL' } });
            });
            return Response.json({ success: true });
        }
    }

    if (entity === 'audit' && req.method === 'GET') {
        // Logic to list audit, but also Admin can access audit (handled in superRoutes? No, adminRoutes should handle if Admin access allowed)
        // But prompt said "Strong RBAC". Super logic in Super. Admin logic in Admin.
        // If Admin needs Audit, I should put it in Admin too OR shared.
        // I'll stick to Super only here.
        const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
        return Response.json({ logs });
    }

    // ── GLOBAL BOOKINGS ──────────────────────────────────────────
    if (entity === 'bookings') {
        // GET /super/bookings — list all bookings globally
        if (!parts[2] && req.method === 'GET') {
            const bookings = await prisma.booking.findMany({
                include: {
                    agency: { select: { id: true, name: true, email: true } },
                    tour: { select: { id: true, name: true } }
                },
                orderBy: { created_at: 'desc' }
            });
            return Response.json({ bookings });
        }

        // POST /super/bookings/retail — Create retail booking via Stripe link
        if (parts[2] === 'retail' && req.method === 'POST') {
            const body = await req.json();
            const { tourId, pax, customerEmail, travelDate, hotelName, hotelAddress, contactPerson, contactPhone, additionalInfo } = z.object({
                tourId: z.string().uuid(),
                pax: z.number().int().min(1),
                customerEmail: z.string().email(),
                travelDate: z.string().transform(s => new Date(s)),
                hotelName: z.string().optional(),
                hotelAddress: z.string().optional(),
                contactPerson: z.string().optional(),
                contactPhone: z.string().optional(),
                additionalInfo: z.string().optional(),
            }).parse(body);

            const tour = await prisma.tour.findUnique({ where: { id: tourId } });
            if (!tour) return Response.json({ error: 'Tour not found' }, { status: 404 });

            // Retail Pricing Math (No Agency Discount)
            const subtotal = Number(tour.price) * pax;
            const vatAmount = subtotal * 0.19; // 19% MWST on full retail
            const finalTotal = subtotal + vatAmount;

            // Save PENDING_PAYMENT booking. (AgencyId is technically required on Booking model.
            // But wait, the Booking model requires an agency. For retail bookings, we can assign it to a "SYSTEM" agency or the super admin's ID, or let it throw if we don't handle it. Let's see how agency is defined. 
            // In the DB `agency_id` is required. I'll fetch the Super Admin's dummy agency (if they have one) or create one for retail system.
            // Let me check if Super Admin has an agency. If not, I'll assume they have to select one or we create a system agency.)
            let sysAgency = await prisma.agency.findFirst({ where: { type: 'System Retail' } });
            if (!sysAgency) {
                sysAgency = await prisma.agency.create({ data: { name: 'EuOnTour Direct Retail', email: 'retail@euontour.com', type: 'System Retail', status: 'ACTIVE', verification_status: 'VERIFIED' } });
            }

            const booking = await prisma.booking.create({
                data: {
                    agency_id: sysAgency.id,
                    tour_id: tour.id,
                    travel_date: travelDate,
                    guests: pax,
                    amount: finalTotal,
                    subtotal: subtotal,
                    vatAmount: vatAmount,
                    discountAmount: 0,
                    status: 'PENDING_PAYMENT',
                    isRetail: true,
                    customerEmail: customerEmail,
                    hotelName,
                    hotelAddress,
                    contactPerson: contactPerson || 'Retail Customer',
                    contactPhone,
                    additionalInfo
                }
            });

            // Create Stripe Checkout Session
            try {
                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items: [{
                        price_data: {
                            currency: 'eur',
                            product_data: { name: `${tour.name} Retail Booking` },
                            unit_amount: Math.round(finalTotal * 100), // cents
                        },
                        quantity: 1,
                    }],
                    customer_email: customerEmail,
                    mode: 'payment',
                    success_url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_FRONTEND_URL || 'http://localhost:5173'}/#/payment-success`,
                    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_FRONTEND_URL || 'http://localhost:5173'}/#/payment-cancel`,
                    metadata: {
                        type: 'retail_booking',
                        bookingId: booking.id
                    }
                });

                // Save session ID and URL to booking
                await prisma.booking.update({
                    where: { id: booking.id },
                    data: {
                        stripeSessionId: session.id,
                        stripeSessionUrl: session.url
                    }
                });

                const smartLink = `https://partners.euontour.com/#/pay/${booking.id}`;

                // Send email to customer with link
                const { sendEmail } = await import('../lib/email.js');
                await sendEmail({
                    to: customerEmail,
                    subject: `EuOnTour - Payment Link for ${tour.name}`,
                    body: `
                        <h2>Complete Your Booking</h2>
                        <p>Hi ${contactPerson || 'there'},</p>
                        <p>Thank you for choosing EuOnTour. Please complete your payment for <strong>${tour.name}</strong> on ${new Date(travelDate).toLocaleDateString()}.</p>
                        <p>Guests: ${pax}</p>
                        <p>Total Amount: €${finalTotal.toFixed(2)}</p>
                        <br/>
                        <a href="${smartLink}" style="padding: 12px 24px; background-color: #E63946; color: white; text-decoration: none; border-radius: 6px; display: inline-block;">Pay Securely Now</a>
                        <br/><br/>
                        <p>If the button doesn't work, copy and paste this link:</p>
                        <p>${smartLink}</p>
                    `
                });

                return Response.json({ checkout_url: smartLink, bookingId: booking.id });
            } catch (error: any) {
                console.error('Stripe Session Error:', error);
                return Response.json({ error: 'Failed to create payment link' }, { status: 500 });
            }
        }

        // POST /super/bookings/:id/cancel — cancel & refund
        if (parts[2] && parts[3] === 'cancel' && req.method === 'POST') {
            const bookingId = parts[2];
            const booking = await prisma.booking.findUnique({
                where: { id: bookingId },
                include: { agency: true, tour: { select: { name: true } } }
            });

            if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });
            if (booking.status === 'CANCELLED' || booking.status === 'CANCELLED_BY_ADMIN') {
                return Response.json({ error: 'Booking is already cancelled' }, { status: 400 });
            }

            const refundAmount = booking.amount;

            await prisma.$transaction(async (tx: any) => {
                // 1. Cancel the booking
                await tx.booking.update({
                    where: { id: bookingId },
                    data: { status: 'CANCELLED_BY_ADMIN' }
                });

                // 2. Refund Agency wallet
                await tx.agency.update({
                    where: { id: booking.agency_id },
                    data: { wallet_balance: { increment: refundAmount } }
                });

                // 3. Create Wallet Ledger entry
                await tx.walletLedger.create({
                    data: {
                        agency_id: booking.agency_id,
                        type: 'CREDIT',
                        amount: refundAmount,
                        reference_type: 'BOOKING_REFUND',
                        reference_id: bookingId,
                        description: `Refund for cancelled booking ${bookingId.slice(0, 8)}… (${booking.tour.name})`
                    }
                });

                // 4. Audit log
                await tx.auditLog.create({
                    data: {
                        actorId: user.userId, actorRole: 'UNKNOWN',
                        action: 'SUPER_CANCEL_BOOKING_REFUND',
                        entityType: 'BOOKING',
                        entityId: bookingId,
                        agency_id: booking.agency_id,
                        metadata: { refundAmount: refundAmount.toString(), tourName: booking.tour.name }
                    }
                });

                // 5. In-app notification
                await tx.appNotification.create({
                    data: {
                        agencyId: booking.agency_id,
                        title: 'Booking Cancelled & Refunded',
                        message: `Your booking for "${booking.tour.name}" has been cancelled. €${Number(refundAmount).toFixed(2)} has been refunded to your wallet.`,
                        type: 'WARNING'
                    }
                });
            });

            // 6. Email notification (fire-and-forget)
            sendEmail({
                to: booking.agency.email,
                ...EMAIL_TEMPLATES.BOOKING_CANCELLED_REFUND(
                    booking.agency.name,
                    booking.tour.name,
                    Number(refundAmount).toFixed(2),
                    bookingId
                )
            }).catch(e => console.error('Failed to send cancellation email:', e));

            return Response.json({ success: true, message: `Booking cancelled. €${Number(refundAmount).toFixed(2)} refunded to ${booking.agency.name}` });
        }
    }

    return Response.json({ error: 'Not Found' }, { status: 404 });
}

async function handleAnalytics(req: Request, user: AuthUser) {
    try {
        const [
            walletAgg,
            revenueAgg,
            pendingDepositsCount,
            totalAgencies,
            recentBookings,
            topAgencies
        ] = await Promise.all([
            // Local Liabilities (Wallet Balances)
            prisma.agency.aggregate({ _sum: { wallet_balance: true } }),

            // Total Platform Revenue
            prisma.booking.aggregate({ _sum: { amount: true }, where: { status: 'CONFIRMED' } }),

            // Pending Requests
            prisma.deposit.count({ where: { status: { in: ['PENDING_ADMIN', 'PENDING_SUPER_ADMIN'] } } }),

            // Active Agencies Count
            prisma.agency.count({ where: { status: 'ACTIVE' } }),

            // 5 Most Recent Bookings Across Platform
            prisma.booking.findMany({
                orderBy: { created_at: 'desc' },
                take: 5,
                include: { agency: { select: { name: true } }, tour: { select: { name: true } } }
            }),

            // Top 5 Agencies By Volume (grouping by booking amount)
            prisma.booking.groupBy({
                by: ['agency_id'],
                _sum: { amount: true },
                where: { status: 'CONFIRMED' },
                orderBy: { _sum: { amount: 'desc' } },
                take: 5
            })
        ]);

        // Enrich the Top Agencies with their Names
        const enrichedTopAgencies = await Promise.all(topAgencies.map(async (top) => {
            const agency = await prisma.agency.findUnique({ where: { id: top.agency_id }, select: { name: true } });
            return {
                agencyName: agency?.name || 'Unknown',
                revenue: Number(top._sum.amount) || 0
            };
        }));

        return Response.json({
            liabilities: Number(walletAgg._sum.wallet_balance) || 0,
            revenue: Number(revenueAgg._sum.amount) || 0,
            pendingDeposits: pendingDepositsCount,
            activeAgencies: totalAgencies,
            recentBookings: recentBookings.map(b => ({
                id: b.id,
                agency: b.agency?.name || 'Unknown',
                tour: b.tour?.name || 'Unknown',
                amount: b.amount,
                date: b.created_at,
                status: b.status
            })),
            topAgencies: enrichedTopAgencies
        });
    } catch (e) {
        console.error('Analytics Error:', e);
        return Response.json({ error: 'Failed to aggregate analytics' }, { status: 500 });
    }
}

async function handleAuditLogs(req: Request, user: AuthUser) {
    try {
        const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 1000
        });
        return Response.json({ logs });
    } catch (e: any) {
        console.error('Logs Error:', e);
        return Response.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }
}
