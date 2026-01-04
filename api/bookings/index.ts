import type { VercelRequest, VercelResponse } from '@vercel/node';
import { bookingSchema } from '../../src/lib/validators/booking';
import { db } from '../_lib/db';
import { requireAuth } from '../_middleware/auth';
import { sendEmail, EMAIL_TEMPLATES } from '../../src/lib/email';
import { BookingStatus, LedgerType } from '../../src/lib/types';

const handler = async (req: VercelRequest, res: VercelResponse, user: { userId: string, role: string }) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const parsed = bookingSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
    }

    const { tourId, travelDate } = parsed.data;
    // Mock guests as 1 since schema doesn't have it yet, but API logic used it. 
    // User schema is authoritative, so we default to 1 or add it if needed. 
    // Assuming 1 pax for now as per schema.
    const guests = 1;

    try {
        const agencyUser = await db.user.findById(user.userId);

        if (!agencyUser || !agencyUser.agency_id) {
            return res.status(403).json({ error: 'Agency profile not found' });
        }

        const agency = await db.agency.findById(agencyUser.agency_id);
        if (!agency) return res.status(403).json({ error: 'Agency not found' });

        if (agency.verification_status !== 'VERIFIED') {
            return res.status(403).json({
                error: 'Agency is not verified. Please complete verification process.',
                status: agency.verification_status
            });
        }

        const tour = await db.tour.findById(tourId);
        if (!tour) {
            return res.status(404).json({ error: 'Tour not found' });
        }

        const totalAmount = Number(tour.price) * guests;

        // Transactional Booking Flow
        const result = await db.$transaction(async (txDb) => {
            // Check Balance (Optimistic Lock optional, usually SELECT FOR UPDATE needed for strictness, but standard transaction level often suffices for now)
            const balance = await txDb.wallet.getBalance(agency.id);
            if (balance < totalAmount) {
                throw new Error(`Insufficient funds. Balance: €${balance.toFixed(2)}, Required: €${totalAmount.toFixed(2)}`);
            }

            // Create Booking
            const booking = await txDb.booking.create({
                agency_id: agency.id,
                tour_id: tour.id,
                travel_date: new Date(travelDate),
                amount: totalAmount,
                status: BookingStatus.CONFIRMED,
            });

            // Debit Wallet
            await txDb.wallet.addEntry({
                agency_id: agency.id,
                amount: totalAmount,
                type: LedgerType.DEBIT,
                reference_type: 'BOOKING',
                reference_id: booking.id,
                description: `Booking for ${tour.name} (${guests} pax)`
            });

            return booking;
        });

        // Async: Email (Outside Transaction)
        const emailData = EMAIL_TEMPLATES.BOOKING_CONFIRMED(result.id, tour.name);

        await sendEmail({
            to: agencyUser.email,
            subject: emailData.subject,
            body: emailData.body
        });

        return res.status(201).json({ booking: result });

    } catch (error: any) {
        if (error.message.includes('Insufficient funds')) {
            return res.status(402).json({ error: error.message });
        }
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export default requireAuth(handler);
