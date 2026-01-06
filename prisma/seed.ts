
import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('Cleaning database...')
    await prisma.refreshToken.deleteMany()
    await prisma.auditLog.deleteMany()
    await prisma.agencyOwnerKyc.deleteMany()
    await prisma.verificationDocument.deleteMany()
    await prisma.walletLedger.deleteMany()
    await prisma.deposit.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.agencyTour.deleteMany()

    // Break circular dependency if any, or just order correctly. 
    // User points to Agency. Agency has Users.
    // If I delete Users first, Agency relation is optional on User side so it's fine.
    await prisma.user.deleteMany()
    await prisma.agency.deleteMany()

    console.log('Creating users...')

    const password = 'C@rdlm4283'
    const hashedPassword = await bcrypt.hash(password, 10)

    // 1. Super Admin (admin@euontour.com)
    const superAdmin = await prisma.user.create({
        data: {
            email: 'admin@euontour.com',
            password_hash: hashedPassword,
            role: UserRole.SUPER_ADMIN,
            email_verified: true,
            verification_token: null
        }
    })
    console.log('Created Super Admin:', superAdmin.email)

    // 2. Admin (support@euontour.com)
    const admin = await prisma.user.create({
        data: {
            email: 'support@euontour.com',
            password_hash: hashedPassword,
            role: UserRole.ADMIN,
            email_verified: true,
            verification_token: null
        }
    })
    console.log('Created Admin:', admin.email)

    console.log('Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
