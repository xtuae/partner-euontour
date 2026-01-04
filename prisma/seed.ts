import { PrismaClient, UserRole, VerificationStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    // 1. Super Admin
    const superEmail = 'super@euontour.com'
    const password = 'password123'
    const hashedPassword = await bcrypt.hash(password, 10)

    const superUser = await prisma.user.upsert({
        where: { email: superEmail },
        update: { role: UserRole.SUPER_ADMIN },
        create: {
            email: superEmail,
            password_hash: hashedPassword,
            role: UserRole.SUPER_ADMIN,
        },
    })
    console.log({ superUser })

    // 2. Admin (Staff)
    const adminEmail = 'admin@euontour.com'
    const adminUser = await prisma.user.upsert({
        where: { email: adminEmail },
        update: { role: UserRole.ADMIN },
        create: {
            email: adminEmail,
            password_hash: hashedPassword,
            role: UserRole.ADMIN,
        },
    })
    console.log({ adminUser })

    // Create Test Agency
    const agencyEmail = 'agency@test.com'

    // Create Agency first (User has agency_id)
    // Wait, typical flow is Signup -> User + Agency.
    // Schema: User -> agency_id (FK). Agency -> users (Many).

    // Create Agency
    const agency = await prisma.agency.upsert({
        where: { email: 'info@testtravels.com' },
        update: {},
        create: {
            name: 'Test Travels Ltd',
            email: 'info@testtravels.com',
            verification_status: VerificationStatus.VERIFIED
        }
    })

    const agencyUser = await prisma.user.upsert({
        where: { email: agencyEmail },
        update: {},
        create: {
            email: agencyEmail,
            role: UserRole.AGENCY,
            password_hash: hashedPassword,
            agency_id: agency.id
        },
    })
    console.log({ agency, agencyUser })
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
