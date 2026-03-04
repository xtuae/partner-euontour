import { prisma } from './db/prisma.js';
import axios from 'axios';
import jwt from 'jsonwebtoken';

export async function syncToursFromWordPress() {
    try {
        const token = jwt.sign(
            { source: 'partner-platform' },
            process.env.WP_JWT_SECRET || 'fallback_secret',
            { expiresIn: '5m' }
        );

        const response = await axios.get('https://euontour.com/wp-json/partner/v1/tours', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const tours = response.data;
        if (!Array.isArray(tours)) {
            throw new Error("Invalid response format from WordPress");
        }

        let syncedCount = 0;
        for (const tour of tours) {
            await prisma.tour.upsert({
                where: { wp_tour_id: tour.wp_tour_id.toString() },
                update: {
                    name: tour.name,
                    price: parseFloat(tour.price),
                    active: tour.active !== undefined ? tour.active : true,
                    image_url: tour.image_url || null
                },
                create: {
                    wp_tour_id: tour.wp_tour_id.toString(),
                    name: tour.name,
                    price: parseFloat(tour.price),
                    active: tour.active !== undefined ? tour.active : true,
                    image_url: tour.image_url || null
                }
            });
            syncedCount++;
        }

        console.log(`Successfully synced ${syncedCount} tours from WordPress.`);
        return { success: true, count: syncedCount };

    } catch (error) {
        console.error("Error syncing tours from WordPress:", error);
        throw error;
    }
}
