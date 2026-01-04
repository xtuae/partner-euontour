import { IUserRepository, IAgencyRepository, IWalletRepository, IBookingRepository, IDepositRepository, ITourRepository, IRefreshTokenRepository } from './repository';
import { mockDb } from './mock-db';
import { User, Agency, WalletLedger, Booking, Deposit, Tour, LedgerType, RefreshToken } from '../types';

// Mock User Repo
export const userRepository: IUserRepository = {
    async findByEmail(email: string): Promise<User | null> {
        return mockDb.users.find(u => u.email === email) || null;
    },
    async findById(id: string): Promise<User | null> {
        return mockDb.users.find(u => u.id === id) || null;
    },
    async findByAgency(agencyId: string): Promise<User[]> {
        return mockDb.users.filter(u => u.agency_id === agencyId);
    },
    async create(data): Promise<User> {
        const user: User = {
            id: `user-${Date.now()}`,
            created_at: new Date(),
            updated_at: new Date(),
            ...data
        };
        mockDb.users.push(user);
        return user;
    }
};

// Mock Agency Repo
export const agencyRepository: IAgencyRepository = {
    async findById(id: string): Promise<Agency | null> {
        return mockDb.agencies.find(a => a.id === id) || null;
    },
    async findAll(): Promise<Agency[]> {
        return mockDb.agencies;
    },
    async create(data): Promise<Agency> {
        const agency: Agency = {
            id: `agency-${Date.now()}`,
            created_at: new Date(),
            updated_at: new Date(),
            ...data
        };
        mockDb.agencies.push(agency);
        return agency;
    },
    async updateStatus(id: string, status): Promise<Agency> {
        const agency = mockDb.agencies.find(a => a.id === id);
        if (!agency) throw new Error('Agency not found');
        agency.verification_status = status;
        agency.updated_at = new Date();
        return agency;
    }
};

// Mock Wallet Repo
export const walletRepository: IWalletRepository = {
    async getBalance(agencyId: string): Promise<number> {
        const credits = mockDb.walletLedger
            .filter(l => l.agency_id === agencyId && l.type === LedgerType.CREDIT)
            .reduce((sum, l) => sum + l.amount, 0);

        const debits = mockDb.walletLedger
            .filter(l => l.agency_id === agencyId && l.type === LedgerType.DEBIT)
            .reduce((sum, l) => sum + l.amount, 0);

        return credits - debits;
    },
    async addEntry(data): Promise<WalletLedger> {
        const entry: WalletLedger = {
            id: `ledger-${Date.now()}`,
            created_at: new Date(),
            ...data
        };
        mockDb.walletLedger.push(entry);
        return entry;
    }
};

// Mock Booking Repo
export const bookingRepository: IBookingRepository = {
    async create(data): Promise<Booking> {
        const booking: Booking = {
            id: `booking-${Date.now()}`,
            created_at: new Date(),
            ...data
        };
        mockDb.bookings.push(booking);
        return booking;
    },
    async findByAgency(agencyId: string): Promise<Booking[]> {
        return mockDb.bookings.filter(b => b.agency_id === agencyId);
    }
};

// Mock Deposit Repo
export const depositRepository: IDepositRepository = {
    async create(data): Promise<Deposit> {
        const deposit: Deposit = {
            id: `deposit-${Date.now()}`,
            created_at: new Date(),
            ...data
        };
        mockDb.deposits.push(deposit);
        return deposit;
    },
    async findByAgency(agencyId: string): Promise<Deposit[]> {
        return mockDb.deposits.filter(d => d.agency_id === agencyId);
    },
    async findAll(): Promise<Deposit[]> {
        return mockDb.deposits;
    },
    async updateStatus(id: string, status): Promise<Deposit> {
        const deposit = mockDb.deposits.find(d => d.id === id);
        if (!deposit) throw new Error('Deposit not found');
        deposit.status = status;
        return deposit;
    }
};

// Mock Tour Repo
export const tourRepository: ITourRepository = {
    async findAllActive(): Promise<Tour[]> {
        return mockDb.tours.filter(t => t.active);
    },
    async findById(id: string): Promise<Tour | null> {
        return mockDb.tours.find(t => t.id === id) || null;
    }
};

// Mock Refresh Token Repo
export const refreshTokenRepository: IRefreshTokenRepository = {
    async create(data): Promise<RefreshToken> {
        const token: RefreshToken = {
            id: `rt-${Date.now()}`,
            created_at: new Date(),
            revoked: false,
            ...data
        };
        mockDb.refreshTokens.push(token);
        return token;
    },
    async findByToken(token: string): Promise<RefreshToken | null> {
        return mockDb.refreshTokens.find(t => t.token === token) || null;
    },
    async revoke(token: string): Promise<void> {
        const t = mockDb.refreshTokens.find(t => t.token === token);
        if (t) t.revoked = true;
    }
};
