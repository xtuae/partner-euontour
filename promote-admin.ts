import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' }); // Try local too

const prisma = new PrismaClient();

async function main() {
    const email = 'hello@hmhlabz.com';
    try {
        const user = await prisma.user.update({
            where: { email },
            data: { role: 'SUPER_ADMIN' },
        });
        console.log(`Successfully promoted ${user.email} to ${user.role}`);
    } catch (e) {
        console.error('Error promoting user:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
