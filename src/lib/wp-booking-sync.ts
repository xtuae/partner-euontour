import { prisma } from './db/prisma.js';
import * as crypto from 'crypto';

export async function pushBookingToWordPress(bookingId: string) {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                tour: true,
                agency: true
            }
        });

        if (!booking || !booking.tour || !booking.agency) {
            console.error(`[WP Sync] Booking ${bookingId} not found or missing relations.`);
            return;
        }

        // Generate JWT token for WP authentication
        const wpJwtSecret = process.env.WP_JWT_SECRET;
        if (!wpJwtSecret) {
            console.error('[WP Sync] WP_JWT_SECRET is not set.');
            return;
        }

        // Basic payload structure needed for the WP API
        const payload = {
            wp_tour_id: booking.tour.wp_tour_id,
            travel_date: booking.travel_date.toISOString().split('T')[0],
            adults: booking.guests || 1, // Map from booking.guests instead of hardcoding 1
            children: 0,
            agency_name: booking.agency.name,
            total_amount_paid: Number(booking.amount), // EXACT deducted amount
        };

        console.log("[WP Sync] Sending WP Payload:", payload);

        // Standard simplistic JWT structure for inter-service auth if WP expects raw HMAC
        // You might need a proper JWT library here if WP strictly validates header.payload.signature
        // Assuming WP allows a simple HMAC or standard JWT. 
        // Using a basic token creation, you may need to adjust based on exact WP plugin requirements.

        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
        const jwtPayload = Buffer.from(JSON.stringify({
            iss: 'partner-portal',
            iat: Math.floor(Date.now() / 1000)
        })).toString('base64url');

        const signature = crypto
            .createHmac('sha256', wpJwtSecret)
            .update(`${header}.${jwtPayload}`)
            .digest('base64url');

        const token = `${header}.${jwtPayload}.${signature}`;

        // Send to WP
        const response = await fetch('https://euontour.com/wp-json/partner/v1/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[WP Sync] Failed to sync booking ${bookingId}. WP responded with: ${response.status} ${errorText}`);
            return;
        }

        const data = await response.json();

        if (data && data.id) { // Assuming WP returns an 'id' field for the new booking
            await prisma.booking.update({
                where: { id: bookingId },
                data: {
                    wp_booking_id: Number(data.id) || null,
                    sync_status: 'SYNCED'
                }
            });
            console.log(`[WP Sync] Successfully synced booking ${bookingId}. WP Booking ID: ${data.id}`);
        } else {
            console.error(`[WP Sync] Unexpected response from WP for booking ${bookingId}:`, data);
        }

    } catch (error) {
        console.error(`[WP Sync] Exception while syncing booking ${bookingId} - WP Sync Failed:`, error);
    }
}
