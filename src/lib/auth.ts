
import { verifyToken } from './auth/jwt.js';

export interface AuthUser {
    userId: string;
    role: string;
}

export async function authHandler(req: Request): Promise<AuthUser | null> {
    // 1. Get Token from Cookie or Header
    // Frontend uses cookies? `requireAuth` previously checked `req.headers.cookie`.
    // "match = cookieHeader.match(/auth_token=([^;]+)/)"

    // Cookie parsing in Web API:
    const cookieHeader = req.headers.get('Cookie') || '';
    const match = cookieHeader.match(/auth_token=([^;]+)/);
    let token = match ? match[1] : null;

    // Fallback to Bearer Header?
    if (!token) {
        const authHeader = req.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }

    if (!token) return null;

    try {
        const decoded = verifyToken(token) as AuthUser | null;
        return decoded;
    } catch (error) {
        return null;
    }
}

export function requireRole(user: AuthUser, allowedRoles: string[]) {
    if (!allowedRoles.includes(user.role)) {
        throw new Error('Forbidden'); // Catcher should handle 403
    }
}
