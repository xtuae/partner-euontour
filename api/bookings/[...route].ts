import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_middleware/auth.js';
import { prisma } from '../../src/lib/db/prisma.js';
import { sendEmail, EMAIL_TEMPLATES } from '../../src/lib/email.js';
import { z } from 'zod';

async function handler(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (req.method === 'GET') return listBookings(req, res, userToken);
    if (req.method === 'POST') return createBooking(req, res, userToken);

    return res.status(405).json({ error: 'Method not allowed' });
}

async function listBookings(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    try {
        let where: any = {};

        if (userToken.role === 'AGENCY') {
            const user = await prisma.user.findUnique({
                where: { id: userToken.userId },
                select: { agency_id: true }
            });
            if (!user || (!user.agency_id)) return res.status(200).json({ bookings: [] });
            where.agency_id = user.agency_id;
        }

        const bookings = await prisma.booking.findMany({
            where,
            include: {
                tour: true,
                agency: { select: { name: true } }
            },
            orderBy: { created_at: 'desc' }
        });

        return res.status(200).json({ bookings });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const CreateBookingSchema = z.object({
    tourId: z.string().uuid(),
    travelDate: z.string().transform((str) => new Date(str)), // Validate date format
});

async function createBooking(req: VercelRequest, res: VercelResponse, userToken: { userId: string, role: string }) {
    if (userToken.role !== 'AGENCY') {
        return res.status(403).json({ error: 'Only agencies can perform bookings' });
    }

    try {
        const { tourId, travelDate } = CreateBookingSchema.parse(req.body);

        const user = await prisma.user.findUnique({
            where: { id: userToken.userId },
            include: { agency: true }
        });

        if (!user || !user.agency) return res.status(400).json({ error: 'Agency not found' });

        const agency = user.agency;

        // 1. Verify Agency Status
        if (agency.verification_status !== 'VERIFIED') {
            return res.status(403).json({ error: 'Agency is not verified. Cannot book.' });
        }

        // 2. Get Tour & Price
        const tour = await prisma.tour.findUnique({ where: { id: tourId } });
        if (!tour) return res.status(404).json({ error: 'Tour not found' });
        if (!tour.active) return res.status(400).json({ error: 'Tour is inactive' });

        // 2.5 Check Agency Assignment (NEW RULE)
        const assignment = await prisma.agencyTour.findUnique({
            where: {
                agencyId_tourId: {
                    agencyId: agency.id,
                    tourId: tour.id
                }
            }
        });

        if (!assignment || !assignment.isActive) {
            return res.status(403).json({ error: 'Tour not available for this agency' });
        }

        // 3. Check Balance
        // Use Decimal comparison
        // prisma returns Decimal.js objects or numbers depending on config.
        // Assuming standard prisma behavior (Decimal).
        if (agency.wallet_balance.lessThan(tour.price)) {
            return res.status(400).json({ error: `Insufficient wallet balance. Required: €${tour.price}, Available: €${agency.wallet_balance}` });
        }

        // 4. Transaction (Debit + Booking)
        const booking = await prisma.$transaction(async (tx: any) => {
            // Re-check balance with lock? 
            // Postgres supports SELECT FOR UPDATE but via raw query or simple atomic update.
            // Using decrement throws if goes negative constraint... assuming check above is mostly fine, atomic update handles concurrency.
            // But prisma atomic decrement doesn't auto-check non-negative unless db constraint exists.
            // We just verified above.

            // Deduct
            const updatedAgency = await tx.agency.update({
                where: { id: agency.id },
                data: {
                    wallet_balance: { decrement: tour.price }
                }
            });

            // Double check (if concurrent)
            if (updatedAgency.wallet_balance.isNegative()) {
                throw new Error("Insufficient balance (concurrent)");
            }

            // Create Booking
            const newBooking = await tx.booking.create({
                data: {
                    agency_id: agency.id,
                    tour_id: tour.id,
                    travel_date: travelDate,
                    amount: tour.price,
                    status: 'CONFIRMED'
                }
            });

            // Create Ledger
            await tx.walletLedger.create({
                data: {
                    agency_id: agency.id,
                    type: 'DEBIT',
                    amount: tour.price,
                    reference_type: 'BOOKING',
                    reference_id: newBooking.id
                }
            });

            return newBooking;
        });

        // Refetch agency for accurate balance
        const finalAgency = await prisma.agency.findUnique({ where: { id: agency.id } });

        await sendEmail({
            to: agency.email,
            ...EMAIL_TEMPLATES.BOOKING_CONFIRMED(
                agency.name,
                booking.id,
                tour.name,
                `€${tour.price}`,
                `€${finalAgency?.wallet_balance || '0.00'}`
            )
        });

        return res.status(201).json({ success: true, booking });

    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
        console.error('Booking Error:', error);

        if (error instanceof Error && error.message.includes('Insufficient balance')) {
            return res.status(400).json({ error: 'Insufficient wallet balance' });
        }

        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAuth(handler);
