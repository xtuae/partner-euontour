import { User, Agency, WalletLedger, Tour, Booking, Deposit, UserRole, LedgerType, RefreshToken } from '../types';

class MockDB {
    public users: User[] = [];
    public agencies: Agency[] = [];
    public walletLedger: WalletLedger[] = [];
    public tours: Tour[] = [];
    public bookings: Booking[] = [];
    public deposits: Deposit[] = [];
    public refreshTokens: RefreshToken[] = [];

    constructor() {
        this.seed();
    }

    private seed() {
        // 1. Tours
        this.tours.push({
            id: 'tour-1',
            name: 'Grand European Tour',
            price: 150.00,
            active: true
        });

        // 2. Agencies
        const agency1: Agency = {
            id: 'agency-1',
            name: 'Happy Travels',
            type: 'Retail',
            email: 'agency@example.com',
            status: true,
            verification_status: 'VERIFIED',
            created_at: new Date(),
            updated_at: new Date()
        };
        this.agencies.push(agency1);

        // 3. Users
        // Agency User
        this.users.push({
            id: 'user-agency-1',
            email: 'agency@example.com',
            password_hash: '$2a$10$hashedpassword', // Mock hash
            role: UserRole.AGENCY,
            agency_id: agency1.id,
            created_at: new Date(),
            updated_at: new Date()
        });

        // Admin User
        this.users.push({
            id: 'user-admin-1',
            email: 'admin@euontour.com',
            password_hash: '$2a$10$hashedpassword',
            role: UserRole.ADMIN,
            created_at: new Date(),
            updated_at: new Date()
        });

        // Super Admin User
        this.users.push({
            id: 'user-super-1',
            email: 'super@euontour.com',
            password_hash: '$2a$10$hashedpassword',
            role: UserRole.SUPER_ADMIN,
            created_at: new Date(),
            updated_at: new Date()
        });

        // 4. Wallet (Initial Balance)
        this.walletLedger.push({
            id: 'ledger-1',
            agency_id: agency1.id,
            amount: 5000.00,
            type: LedgerType.CREDIT,
            description: 'Initial seed funds',
            reference_type: 'SEED',
            reference_id: 'init-1',
            created_at: new Date()
        });
    }
}

export const mockDb = new MockDB();
