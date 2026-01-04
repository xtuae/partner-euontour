// src/lib/db/index.ts
import { prisma } from './prisma';
import { PrismaUserRepository, PrismaAgencyRepository, PrismaWalletRepository, PrismaBookingRepository, PrismaDepositRepository, PrismaTourRepository, PrismaRefreshTokenRepository } from './prisma-repos';
import * as mockRepos from './mock-repos';
// import { IUserRepository, IAgencyRepository, IWalletRepository, IBookingRepository, IDepositRepository, ITourRepository } from './repository';

// Config
const USE_MOCK_DB = process.env.USE_MOCK_DB === 'true'; // Set to false to use Real DB

// Factory to create DB interface from a client
const createDB = (client: any) => ({
    user: USE_MOCK_DB ? mockRepos.userRepository : new PrismaUserRepository(client),
    agency: USE_MOCK_DB ? mockRepos.agencyRepository : new PrismaAgencyRepository(client),
    wallet: USE_MOCK_DB ? mockRepos.walletRepository : new PrismaWalletRepository(client),
    booking: USE_MOCK_DB ? mockRepos.bookingRepository : new PrismaBookingRepository(client),
    deposit: USE_MOCK_DB ? mockRepos.depositRepository : new PrismaDepositRepository(client),
    tour: USE_MOCK_DB ? mockRepos.tourRepository : new PrismaTourRepository(client),
    refreshToken: USE_MOCK_DB ? mockRepos.refreshTokenRepository : new PrismaRefreshTokenRepository(client),
});

// Default Global DB
export const db = {
    ...createDB(prisma),
    $transaction: async <T>(callback: (txDb: ReturnType<typeof createDB>) => Promise<T>): Promise<T> => {
        if (USE_MOCK_DB) {
            // Mock transaction just executes callback with same mock db
            return callback(createDB(null));
        }
        return prisma.$transaction(async (tx) => {
            return callback(createDB(tx));
        });
    }
};
