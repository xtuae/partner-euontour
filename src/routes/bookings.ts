
import { prisma } from '../lib/db/prisma.js';
import { AuthUser, requireRole } from '../lib/auth.js';
import { sendEmail, EMAIL_TEMPLATES } from '../lib/email.js';
import { pushBookingToWordPress } from '../lib/wp-booking-sync.js';
import { z } from 'zod';

const CreateBookingSchema = z.object({ tourId: z.string().uuid(), travelDate: z.string().transform(s => new Date(s)), pax: z.number().int().min(1).default(1), targetAgencyId: z.string().uuid().optional() });

export async function bookingsRoutes(req: Request, path: string, user: AuthUser) {
    const parts = path.split('/').filter(Boolean); // ["bookings"]

    // LIST
    if (parts.length === 1 && req.method === 'GET') {
        const where: any = {};
        if (user.role === 'AGENCY') {
            const u = await prisma.user.findUnique({ where: { id: user.userId }, select: { agency_id: true } });
            if (!u?.agency_id) return Response.json({ bookings: [] });
            where.agency_id = u.agency_id;
        }
        const bookings = await prisma.booking.findMany({ where, include: { tour: true, agency: { select: { name: true } } }, orderBy: { created_at: 'desc' } });
        return Response.json({ bookings });
    }

    // CREATE
    if (parts.length === 1 && req.method === 'POST') {
        requireRole(user, ['AGENCY', 'SUPER_ADMIN']);
        const { tourId, travelDate, pax, targetAgencyId } = CreateBookingSchema.parse(await req.json());

        let agencyIdToUse: string;

        if (user.role === 'SUPER_ADMIN') {
            if (!targetAgencyId) return Response.json({ error: 'targetAgencyId required for Super Admin proxy booking' }, { status: 400 });
            const targetAgency = await prisma.agency.findUnique({ where: { id: targetAgencyId } });
            if (!targetAgency) return Response.json({ error: 'Target agency not found' }, { status: 404 });
            if (targetAgency.verification_status !== 'VERIFIED') return Response.json({ error: 'Target agency not verified' }, { status: 403 });
            agencyIdToUse = targetAgency.id;
        } else {
            const u = await prisma.user.findUnique({ where: { id: user.userId }, include: { agency: true } });
            if (!u?.agency) return Response.json({ error: 'Agency not found' }, { status: 400 });
            if (u.agency.verification_status !== 'VERIFIED') return Response.json({ error: 'Not verified' }, { status: 403 });
            agencyIdToUse = u.agency.id;
        }

        const tour = await prisma.tour.findUnique({ where: { id: tourId } });
        if (!tour || !tour.active) return Response.json({ error: 'Invalid tour' }, { status: 400 });

        // ... (check assignment, check balance, transaction) ...
        // B2B Pricing Math
        const subtotal = Number(tour.price) * pax;
        const discountPercent = 10; // Default or fetched from system settings
        const discountAmount = subtotal * (discountPercent / 100);
        const netPrice = subtotal - discountAmount;
        const vatAmount = netPrice * 0.19; // 19% MWST
        const finalTotal = netPrice + vatAmount;

        const booking = await prisma.$transaction(async (tx: any) => {
            const updated = await tx.agency.update({ where: { id: agencyIdToUse }, data: { wallet_balance: { decrement: finalTotal } } });
            if (updated.wallet_balance.isNegative()) throw new Error('Insufficient funds');

            const b = await tx.booking.create({
                data: {
                    agency_id: agencyIdToUse,
                    tour_id: tour.id,
                    travel_date: travelDate,
                    amount: finalTotal,
                    subtotal: subtotal,
                    discountAmount: discountAmount,
                    vatAmount: vatAmount,
                    guests: pax,
                    status: 'CONFIRMED'
                }
            });

            await tx.walletLedger.create({ data: { agency_id: agencyIdToUse, type: 'DEBIT', amount: finalTotal, reference_type: 'BOOKING', reference_id: b.id } });

            if (user.role === 'SUPER_ADMIN') {
                await tx.auditLog.create({
                    data: { actor_id: user.userId, action: 'PROXY_BOOKING_CREATED', entity: 'BOOKING', entity_id: b.id }
                });
            }

            // In-App Notifications
            await tx.appNotification.create({
                data: {
                    agencyId: agencyIdToUse,
                    title: 'Booking Confirmed',
                    message: `Your booking for ${tour.name} has been processed. €${finalTotal.toFixed(2)} deducted.`,
                    type: 'INFO'
                }
            });

            // Global Super Admin Notification
            const superAdmins = await tx.user.findMany({ where: { role: 'SUPER_ADMIN' } });
            // Since appNotifications are agency-scoped right now according to schema, let's just create an AuditLog
            // for admins or create a system-level notification if model supports it.  
            // BUT schema.prisma shows app_notifications bound to Agency. So we just skip the DB admin alert 
            // and rely strictly on the super admin EMAIL alert.

            return b;
        });

        // Fetch agency details for emails
        const bookingAgency = await prisma.agency.findUnique({ where: { id: agencyIdToUse }, include: { users: true } });
        const agencyEmailUrl = bookingAgency?.email || (bookingAgency?.users[0]?.email);

        // Async trigger WP Sync & Emails
        pushBookingToWordPress(booking.id).catch(err => console.error('[WP Async Sync Error]', err));

        if (agencyEmailUrl && bookingAgency) {
            sendEmail({
                to: agencyEmailUrl,
                ...EMAIL_TEMPLATES.BOOKING_CONFIRMATION(
                    bookingAgency.name,
                    tour.name,
                    pax,
                    travelDate.toLocaleDateString(),
                    subtotal.toFixed(2),
                    discountAmount.toFixed(2),
                    vatAmount.toFixed(2),
                    finalTotal.toFixed(2)
                )
            }).catch(e => console.error(e));
        }

        const superAdmins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN', active: true } });
        superAdmins.forEach(admin => {
            sendEmail({
                to: admin.email,
                ...EMAIL_TEMPLATES.NEW_BOOKING_ALERT(
                    bookingAgency?.name || 'Unknown Agency',
                    tour.name,
                    pax,
                    travelDate.toLocaleDateString(),
                    finalTotal.toFixed(2),
                    `${process.env.NEXT_PUBLIC_APP_URL}/#/super-admin/bookings`
                )
            }).catch(e => console.error(e));
        });

        return Response.json({ success: true, booking });
    }

    // CANCEL (Admin)
    if (parts.length === 3 && parts[2] === 'cancel' && req.method === 'PUT') {
        requireRole(user, ['ADMIN', 'SUPER_ADMIN']);
        const bookingId = parts[1];
        // ... cancel logic (refund) ...
        await prisma.$transaction(async (tx: any) => {
            const b = await tx.booking.findUnique({ where: { id: bookingId } });
            if (!b) throw new Error('Not found');
            await tx.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED_BY_ADMIN' } });
            // Refund
            await tx.agency.update({ where: { id: b.agency_id }, data: { wallet_balance: { increment: b.amount } } });
            await tx.walletLedger.create({ data: { agency_id: b.agency_id, type: 'CREDIT', amount: b.amount, reference_type: 'REFUND', reference_id: b.id } });
        });
        return Response.json({ success: true });
    }

    return Response.json({ error: 'Not Found' }, { status: 404 });
}
