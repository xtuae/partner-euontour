import { stripe } from '../lib/stripe.js';
import { prisma } from '../lib/db/prisma.js';
import { AuthUser, requireRole } from '../lib/auth.js';
import { sendEmail, EMAIL_TEMPLATES } from '../lib/email.js';
import { pushBookingToWordPress } from '../lib/wp-booking-sync.js';
import { createAuditLog } from '../lib/logger.js';
import Stripe from 'stripe';

export async function stripeRoutes(req: Request, path: string, user?: AuthUser) {
    const parts = path.split('/').filter(Boolean); // ["stripe", ...]

    // PUBLIC WEBHOOK: POST /api/stripe/webhook
    if (path === '/stripe/webhook' && req.method === 'POST') {
        const rawBody = await req.text(); // Raw body for Stripe signature verification
        let event: Stripe.Event;

        try {
            const signature = req.headers.get('stripe-signature') || '';
            const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
            event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        } catch (err: any) {
            console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
            return new Response(`Webhook Error: ${err.message}`, { status: 400 });
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            const meta = session.metadata || {};

            if (meta.type === 'wallet_topup') {
                const depositRaw = await prisma.deposit.findFirst({ where: { stripeSessionId: session.id } });
                if (depositRaw && depositRaw.status === 'PENDING_ADMIN') {
                    // Start transaction
                    await prisma.$transaction(async (tx) => {
                        await tx.deposit.update({
                            where: { id: depositRaw.id },
                            data: { status: 'APPROVED' }
                        });

                        await tx.agency.update({
                            where: { id: depositRaw.agency_id },
                            data: { wallet_balance: { increment: depositRaw.amount } }
                        });

                        await tx.walletLedger.create({
                            data: {
                                agency_id: depositRaw.agency_id,
                                type: 'CREDIT',
                                amount: depositRaw.amount,
                                reference_type: 'DEPOSIT',
                                reference_id: depositRaw.id
                            }
                        });

                        // Log action (Using standard system user log logic or audit logger if implemented)
                        console.log(`[Stripe Webhook] Approved Wallet Topup for deposit ${depositRaw.id}`);
                    });

                    // Inject logger after successful transaction
                    await createAuditLog({
                        actorId: 'SYSTEM',
                        actorRole: 'SYSTEM',
                        action: 'WALLET_TOPUP_APPROVED_BY_STRIPE',
                        entityType: 'DEPOSIT',
                        entityId: depositRaw.id,
                        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1'
                    });
                }
            } else if (meta.type === 'retail_booking') {
                const bookingId = meta.bookingId;
                const booking = await prisma.booking.findUnique({
                    where: { id: bookingId },
                    include: { tour: true, agency: true }
                });

                if (booking && booking.status === 'PENDING_PAYMENT') {
                    await prisma.booking.update({
                        where: { id: bookingId },
                        data: { status: 'CONFIRMED' }
                    });

                    // Trigger WordPress sync
                    pushBookingToWordPress(bookingId).catch(err => console.error('[WP Async Sync Error]', err));

                    // Send Confirmation Email
                    if (booking.customerEmail) {
                        sendEmail({
                            to: booking.customerEmail,
                            subject: 'Your Booking is Confirmed! - EuOnTour',
                            body: `Thank you for your retail booking for ${booking.tour.name}. Total Paid: €${booking.amount}. We look forward to seeing you!`
                        }).catch(e => console.error('[Email Failed]', e));
                    }
                    console.log(`[Stripe Webhook] Retail Booking ${bookingId} marked as CONFIRMED.`);

                    await createAuditLog({
                        actorId: 'SYSTEM',
                        actorRole: 'SYSTEM',
                        action: 'RETAIL_BOOKING_CONFIRMED_BY_STRIPE',
                        entityType: 'BOOKING',
                        entityId: bookingId,
                        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1'
                    });
                }
            }
        }
        return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // REQUIRE AUTH FOR THE FOLLOWING ROUTES
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // POST /api/stripe/create-topup-session
    if (path === '/stripe/create-topup-session' && req.method === 'POST') {
        requireRole(user, ['AGENCY']);
        const { amount } = await req.json();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) return Response.json({ error: 'Invalid amount' }, { status: 400 });

        const u = await prisma.user.findUnique({ where: { id: user.userId }, select: { agency_id: true } });
        if (!u?.agency_id) return Response.json({ error: 'No agency' }, { status: 403 });

        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'eur',
                        product_data: { name: 'Wallet Top-Up' },
                        unit_amount: Math.round(numAmount * 100), // cents
                    },
                    quantity: 1,
                }],
                mode: 'payment',
                success_url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_FRONTEND_URL || 'http://localhost:5173'}/#/agency/wallet?topup=success`,
                cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_FRONTEND_URL || 'http://localhost:5173'}/#/agency/wallet?topup=canceled`,
                metadata: {
                    type: 'wallet_topup',
                    agencyId: u.agency_id
                }
            });

            // Save PENDING deposit with session track
            await prisma.deposit.create({
                data: {
                    agency_id: u.agency_id,
                    amount: numAmount,
                    bank_reference: 'STRIPE_ONLINE',
                    status: 'PENDING_ADMIN', // We map standard PENDING to PENDING_ADMIN for deposits here
                    stripeSessionId: session.id
                }
            });

            return Response.json({ checkout_url: session.url });
        } catch (error: any) {
            console.error(error);
            return Response.json({ error: 'Failed to create Stripe session' }, { status: 500 });
        }
    }

    // Return 404 for unhandled stripe routes
    return new Response(JSON.stringify({ error: 'Stripe endpoint not found' }), { status: 404 });
}
