export enum UserRole {
    AGENCY = 'AGENCY',
    ADMIN = 'ADMIN',
    SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum BookingStatus {
    CONFIRMED = 'CONFIRMED',
    PENDING = 'PENDING',
    CANCELLED = 'CANCELLED'
}

export enum LedgerType {
    CREDIT = 'CREDIT',
    DEBIT = 'DEBIT'
}

export enum DepositStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
}

export interface User {
    id: string;
    email: string;
    password_hash: string;
    role: UserRole;
    agency_id?: string;
    created_at: Date;
    updated_at: Date;
}

export interface Agency {
    id: string;
    name: string;
    type: string;
    email: string;
    status: string; // AgencyStatus
    verification_status: string; // VerificationStatus
    created_at: Date;
    updated_at: Date;
}

export interface WalletLedger {
    id: string;
    agency_id: string;
    amount: number; // Stored as Decimal in DB, number here
    type: LedgerType;
    description: string;
    reference_type: string;
    reference_id: string;
    created_at: Date;
}

export interface RefreshToken {
    id: string;
    token: string;
    user_id: string;
    expires_at: Date;
    created_at: Date;
    revoked: boolean;
}

export interface Tour {
    id: string;
    name: string;
    price: number;
    active: boolean;
}

export interface Booking {
    id: string;
    agency_id: string;
    tour_id: string;
    travel_date: Date;
    amount: number;
    status: BookingStatus;
    created_at: Date;
}

export interface Deposit {
    id: string;
    agency_id: string;
    amount: number;
    proof_url: string | null;
    bank_reference: string;
    status: DepositStatus;
    created_at: Date;
}
