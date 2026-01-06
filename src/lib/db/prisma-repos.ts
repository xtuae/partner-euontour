import { PrismaClient, Prisma } from '@prisma/client';
import { IUserRepository, IAgencyRepository, IWalletRepository, IBookingRepository, IDepositRepository, ITourRepository, IRefreshTokenRepository } from './repository.js';
import { User, Agency, WalletLedger, Booking, Deposit, Tour, UserRole, BookingStatus, DepositStatus, LedgerType, RefreshToken } from '../types.js';

type PrismaTx = PrismaClient | Prisma.TransactionClient;

// Helper to map Prisma User to Domain User
const mapUser = (p: any): User => ({
    id: p.id,
    email: p.email,
    password_hash: p.password_hash,
    role: p.role as UserRole,
    agency_id: p.agency_id || undefined,
    created_at: p.created_at,
    updated_at: p.created_at // fallback
});

// User Repository
export class PrismaUserRepository implements IUserRepository {
    constructor(private client: PrismaTx) { }

    async findByEmail(email: string): Promise<User | null> {
        const user = await this.client.user.findUnique({ where: { email } });
        return user ? mapUser(user) : null;
    }
    async findById(id: string): Promise<User | null> {
        const user = await this.client.user.findUnique({ where: { id } });
        return user ? mapUser(user) : null;
    }
    async findByAgency(agencyId: string): Promise<User[]> {
        const users = await this.client.user.findMany({ where: { agency_id: agencyId } });
        return users.map(mapUser);
    }
    async create(data: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
        const user = await this.client.user.create({
            data: {
                // id: undefined, // Let DB generate UUID
                email: data.email,
                password_hash: data.password_hash,
                role: data.role as any,
                agency_id: data.agency_id
            }
        });
        return mapUser(user);
    }
}

// Agency Repository
export class PrismaAgencyRepository implements IAgencyRepository {
    constructor(private client: PrismaTx) { }

    async findById(id: string): Promise<Agency | null> {
        const agency = await this.client.agency.findUnique({ where: { id } });
        if (!agency) return null;
        return {
            ...agency,
            verification_status: agency.verification_status as any,
            updated_at: agency.updated_at
        };
    }
    async findAll(): Promise<Agency[]> {
        const agencies = await this.client.agency.findMany();
        return agencies.map((a: any) => ({ ...a, verification_status: a.verification_status as any, updated_at: a.updated_at }));
    }
    async create(data: Omit<Agency, 'id' | 'created_at' | 'updated_at'>): Promise<Agency> {
        const agency = await this.client.agency.create({
            data: {
                name: data.name,
                email: data.email,
                verification_status: data.verification_status as any,
                status: data.status as any,
                type: data.type
            }
        });
        return { ...agency, verification_status: agency.verification_status as any, updated_at: agency.updated_at };
    }
    async updateStatus(id: string, status: Agency['verification_status']): Promise<Agency> {
        const agency = await this.client.agency.update({
            where: { id },
            data: { verification_status: status as any }
        });
        return { ...agency, verification_status: agency.verification_status as any, updated_at: agency.updated_at };
    }
}

// Wallet Repository
export class PrismaWalletRepository implements IWalletRepository {
    constructor(private client: PrismaTx) { }

    async getBalance(agencyId: string): Promise<number> {
        const credits = await this.client.walletLedger.aggregate({
            where: { agency_id: agencyId, type: 'CREDIT' },
            _sum: { amount: true }
        });
        const debits = await this.client.walletLedger.aggregate({
            where: { agency_id: agencyId, type: 'DEBIT' },
            _sum: { amount: true }
        });
        return (Number(credits._sum.amount) || 0) - (Number(debits._sum.amount) || 0);
    }
    async addEntry(entry: Omit<WalletLedger, 'id' | 'created_at'>): Promise<WalletLedger> {
        const record = await this.client.walletLedger.create({
            data: {
                agency_id: entry.agency_id,
                amount: entry.amount,
                type: entry.type as any,
                reference_type: entry.reference_type,
                reference_id: entry.reference_id
            }
        });
        return {
            id: record.id,
            agency_id: record.agency_id,
            amount: Number(record.amount),
            type: record.type as LedgerType,
            reference_type: record.reference_type,
            reference_id: record.reference_id || '',
            description: '',
            created_at: record.created_at
        };
    }
}

// Booking Repository
export class PrismaBookingRepository implements IBookingRepository {
    constructor(private client: PrismaTx) { }

    async create(data: Omit<Booking, 'id' | 'created_at'>): Promise<Booking> {
        const booking = await this.client.booking.create({
            data: {
                agency_id: data.agency_id,
                tour_id: data.tour_id,
                travel_date: data.travel_date,
                amount: data.amount,
                status: data.status as any
            }
        });
        return {
            ...booking,
            amount: Number(booking.amount),
            status: booking.status as BookingStatus
        };
    }
    async findByAgency(agencyId: string): Promise<Booking[]> {
        const bookings = await this.client.booking.findMany({ where: { agency_id: agencyId } });
        return bookings.map((b: any) => ({
            ...b,
            amount: Number(b.amount),
            status: b.status as BookingStatus
        }));
    }
}

// Deposit Repository
export class PrismaDepositRepository implements IDepositRepository {
    constructor(private client: PrismaTx) { }

    async create(data: Omit<Deposit, 'id' | 'created_at'>): Promise<Deposit> {
        const deposit = await this.client.deposit.create({
            data: {
                agency_id: data.agency_id,
                amount: data.amount,
                bank_reference: data.bank_reference,
                proof_url: data.proof_url,
                status: data.status as any
            }
        });
        return { ...deposit, amount: Number(deposit.amount), status: deposit.status as DepositStatus };
    }
    async findByAgency(agencyId: string): Promise<Deposit[]> {
        const deposits = await this.client.deposit.findMany({ where: { agency_id: agencyId } });
        return deposits.map((d: any) => ({ ...d, amount: Number(d.amount), status: d.status as DepositStatus }));
    }
    async findAll(): Promise<Deposit[]> {
        const deposits = await this.client.deposit.findMany();
        return deposits.map((d: any) => ({ ...d, amount: Number(d.amount), status: d.status as DepositStatus }));
    }
    async updateStatus(id: string, status: Deposit['status']): Promise<Deposit> {
        const deposit = await this.client.deposit.update({
            where: { id },
            data: { status: status as any }
        });
        return { ...deposit, amount: Number(deposit.amount), status: deposit.status as DepositStatus };
    }
}

// Tour Repository
export class PrismaTourRepository implements ITourRepository {
    constructor(private client: PrismaTx) { }

    async findAllActive(): Promise<Tour[]> {
        const tours = await this.client.tour.findMany({ where: { active: true } });
        return tours.map((t: any) => ({ ...t, price: Number(t.price) }));
    }
    async findById(id: string): Promise<Tour | null> {
        const tour = await this.client.tour.findUnique({ where: { id } });
        return tour ? { ...tour, price: Number(tour.price) } : null;
    }
}

// Refresh Token Repository
export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
    constructor(private client: PrismaTx) { }

    async create(data: Omit<RefreshToken, 'id' | 'created_at' | 'revoked'>): Promise<RefreshToken> {
        const token = await this.client.refreshToken.create({
            data: {
                token: data.token,
                user_id: data.user_id,
                expires_at: data.expires_at,
                revoked: false
            }
        });
        return {
            id: token.id,
            token: token.token,
            user_id: token.user_id,
            expires_at: token.expires_at,
            created_at: token.created_at,
            revoked: token.revoked
        };
    }
    async findByToken(token: string): Promise<RefreshToken | null> {
        const t = await this.client.refreshToken.findUnique({ where: { token } });
        return t as RefreshToken | null;
    }
    async revoke(token: string): Promise<void> {
        await this.client.refreshToken.update({
            where: { token },
            data: { revoked: true }
        });
    }
}
