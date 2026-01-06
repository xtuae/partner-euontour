
// src/lib/db/index.ts
import { prisma } from './prisma.js';
import { PrismaUserRepository, PrismaAgencyRepository, PrismaWalletRepository, PrismaBookingRepository, PrismaDepositRepository, PrismaTourRepository, PrismaRefreshTokenRepository } from './prisma-repos.js';

// import { IUserRepository, IAgencyRepository, IWalletRepository, IBookingRepository, IDepositRepository, ITourRepository } from './repository';

// Flag for Mock DB (Disabled)
export const USE_MOCK_DB = false;

// Factory to create DB interface from a client
const createDB = (client: any) => ({
    user: new PrismaUserRepository(client),
    agency: new PrismaAgencyRepository(client),
    wallet: new PrismaWalletRepository(client),
    booking: new PrismaBookingRepository(client),
    deposit: new PrismaDepositRepository(client),
    tour: new PrismaTourRepository(client),
    refreshToken: new PrismaRefreshTokenRepository(client),
});

// Default Global DB
export const db = {
    ...createDB(prisma),
    $transaction: async <T>(callback: (txDb: ReturnType<typeof createDB>) => Promise<T>): Promise<T> => {
        // Mock transaction just executes callback with same mock db
        // Since USE_MOCK_DB is now always false, this block will not be executed.
        // However, keeping it for future potential re-enabling of mock DB.
        if (USE_MOCK_DB) {
            // Mock transaction just executes callback with same mock db
            return callback(createDB(null));
        }
        return prisma.$transaction(async (tx: any) => {
            return callback(createDB(tx));
        });
    }
};
