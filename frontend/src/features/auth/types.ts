export enum ROLES {
    AGENCY = 'AGENCY',
    ADMIN = 'ADMIN',
    SUPER_ADMIN = 'SUPER_ADMIN'
}

export interface User {
    id: string;
    email: string;
    role: ROLES;
    agency?: Agency;
}

export interface Agency {
    id: string;
    name: string;
    email: string;
    verification_status: string;
}

export interface Permission {
    action: string;
    subject: string;
}
