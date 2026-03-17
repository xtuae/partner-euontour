import { prisma } from './db/prisma.js';
import axios from 'axios';
import jwt from 'jsonwebtoken';

export async function syncToursFromWordPress() {
    const WP_API_URL = 'https://euontour.com/wp-json/partner/v1/tours';
    try {
        const token = jwt.sign(
            { source: 'partner-platform' },
            process.env.WP_JWT_SECRET || 'fallback_secret',
            { expiresIn: '5m' }
        );

        const response = await axios.get(WP_API_URL, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const tours = response.data.data || response.data; // Handle both direct array and nested data

        if (!tours || !Array.isArray(tours)) {
            console.error("🛑 Unexpected Success Payload:", response.data);
            throw new Error(`WordPress returned 200 OK, but no tours array was found.`);
        }

        // Fetch the global discount percentage setting
        const discountSetting = await prisma.systemSettings.findUnique({ where: { key: 'AGENCY_DISCOUNT_PERCENTAGE' } });
        let discountPercentage = 10; // Default limit
        if (discountSetting && !isNaN(parseFloat(discountSetting.value))) {
            discountPercentage = parseFloat(discountSetting.value);
        }
        // e.g. 10% -> 0.10
        const discountMultiplier = discountPercentage / 100;

        // Upsert tours into your Prisma database
        let syncedCount = 0;
        for (const tour of tours) {
            console.log("--- SYNCING WP TOUR ---");
            console.log("Raw WP Tour object keys:", Object.keys(tour));
            // Log nested options to help debugging
            console.log("Structure sample:", JSON.stringify({
                content: !!tour.content,
                excerpt: !!tour.excerpt,
                tf_destinations: tour.tf_destinations,
                tf_tours_opt: tour.tf_tours_opt ? "Exists" : "Missing"
            }));

            const retailPrice = parseFloat(tour.price);
            const agencyNetPrice = retailPrice - (retailPrice * discountMultiplier);

            // Extract rich Tourfic metadata
            let description = tour?.content?.rendered || tour?.description || null;
            if (!description) {
                if (tour.excerpt && typeof tour.excerpt === 'object' && tour.excerpt.rendered) {
                    description = tour.excerpt.rendered;
                }
            }

            let locationName = tour.location || tour.destination || null;
            if (!locationName) {
                if (tour.tourfic_advanced_data?.destinations && Array.isArray(tour.tourfic_advanced_data.destinations) && tour.tourfic_advanced_data.destinations.length > 0) {
                    locationName = tour.tourfic_advanced_data.destinations[0].name || tour.tourfic_advanced_data.destinations[0];
                } else if (tour.tf_destinations && Array.isArray(tour.tf_destinations) && tour.tf_destinations.length > 0) {
                    locationName = tour.tf_destinations[0].name || tour.tf_destinations[0];
                } else if (tour.tf_tours_opt && tour.tf_tours_opt.location) {
                    locationName = tour.tf_tours_opt.location;
                }
            }

            const meta = tour.tourfic_advanced_data?.meta || {};
            const gallery = Array.isArray(meta.gallery) ? meta.gallery : (Array.isArray(tour.gallery) ? tour.gallery : []);
            const inclusions = Array.isArray(meta.inclusions) ? meta.inclusions : (Array.isArray(tour.inclusions) ? tour.inclusions : []);
            const exclusions = Array.isArray(meta.exclusions) ? meta.exclusions : (Array.isArray(tour.exclusions) ? tour.exclusions : []);
            const itinerary = meta.itinerary || tour.itinerary || null;
            const meetingPoint = tour.meeting_point || tour.meetingPoint || null;

            const sharedData = {
                name: tour.name,
                price: retailPrice,
                location: locationName,
                description,
                duration: tour.duration || null,
                agency_net_price: agencyNetPrice,
                active: tour.active !== undefined ? tour.active : true,
                image_url: tour.image_url || null,
                gallery,
                inclusions,
                exclusions,
                itinerary,
                meetingPoint
            };

            await prisma.tour.upsert({
                where: { wp_tour_id: Number(tour.wp_tour_id) },
                update: sharedData,
                create: {
                    wp_tour_id: Number(tour.wp_tour_id),
                    ...sharedData
                }
            });
            syncedCount++;
        }

        console.log(`✅ Successfully synced ${syncedCount} tours from WordPress.`);
        return { success: true, count: syncedCount };

    } catch (error: any) {
        // --- DETAILED AXIOS ERROR LOGGING ---
        if (error.response) {
            // The server responded with a status code outside the 2xx range (e.g., 401, 404, 500)
            console.error('🛑 WP API HTTP Status:', error.response.status);
            console.error('🛑 WP API Response Data:', JSON.stringify(error.response.data, null, 2));

            throw new Error(`WordPress rejected request. Status: ${error.response.status}. Details: ${JSON.stringify(error.response.data)}`);

        } else if (error.request) {
            // The request was made but no response was received (Timeout or DNS error)
            console.error('🛑 No response received from WordPress. Is the URL correct?', WP_API_URL);
            throw new Error('No response received from WordPress server.');

        } else {
            // Something else triggered an error before the request was sent
            console.error('🛑 Sync Script Error:', error.message);
            throw new Error(`Sync setup failed: ${error.message}`);
        }
    }
}
