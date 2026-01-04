import { User, Agency, WalletLedger, Booking, Deposit, Tour, RefreshToken } from '../types';

export interface IUserRepository {
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    findByAgency(agencyId: string): Promise<User[]>;
    create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User>;
}

export interface IAgencyRepository {
    findById(id: string): Promise<Agency | null>;
    findAll(): Promise<Agency[]>;
    create(agency: Omit<Agency, 'id' | 'created_at' | 'updated_at'>): Promise<Agency>;
    updateStatus(id: string, status: Agency['verification_status']): Promise<Agency>;
}

export interface IWalletRepository {
    getBalance(agencyId: string): Promise<number>;
    addEntry(entry: Omit<WalletLedger, 'id' | 'created_at'>): Promise<WalletLedger>;
}

export interface IBookingRepository {
    create(booking: Omit<Booking, 'id' | 'created_at'>): Promise<Booking>;
    findByAgency(agencyId: string): Promise<Booking[]>;
}

export interface IDepositRepository {
    create(deposit: Omit<Deposit, 'id' | 'created_at'>): Promise<Deposit>;
    findByAgency(agencyId: string): Promise<Deposit[]>;
    findAll(): Promise<Deposit[]>;
    updateStatus(id: string, status: Deposit['status']): Promise<Deposit>;
}

export interface ITourRepository {
    findAllActive(): Promise<Tour[]>;
    findById(id: string): Promise<Tour | null>;
}

export interface IRefreshTokenRepository {
    create(data: Omit<RefreshToken, 'id' | 'created_at' | 'revoked'>): Promise<RefreshToken>;
    findByToken(token: string): Promise<RefreshToken | null>;
    revoke(token: string): Promise<void>;
}
