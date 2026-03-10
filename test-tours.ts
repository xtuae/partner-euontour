import { prisma } from './src/lib/db/prisma.js';
async function test() {
    const tours = await prisma.tour.findMany();
    console.log("Total tours:", tours.length);
    console.log("Active tours:", tours.filter(t => t.active).length);
    console.log("First tour:", tours[0]);
}
test().catch(console.error).finally(() => process.exit(0));
