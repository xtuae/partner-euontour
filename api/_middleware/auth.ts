import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../../src/lib/auth/jwt.js';
import { handleCors } from '../../src/lib/cors.js';

export type AuthenticatedRequest = VercelRequest & {
    user?: {
        userId: string;
        role: string;
        // agencyId might need to be fetched if not in token, but token has role. 
        // We'll rely on verifyToken payload structure.
    }
};

type HandlerWithUser = (req: AuthenticatedRequest, res: VercelResponse, user: { userId: string, role: string }) => Promise<void | VercelResponse>;

export function requireAuth(handler: HandlerWithUser, allowedRoles?: string[]) {
    return async (req: VercelRequest, res: VercelResponse) => {
        if (handleCors(req, res)) return;

        // 1. Get Token from Cookie
        const cookieHeader = req.headers.cookie || '';
        const match = cookieHeader.match(/auth_token=([^;]+)/);
        const token = match ? match[1] : null;

        if (!token) return res.status(401).json({ error: "Unauthorized" });

        try {
            // 2. Verify Token
            const decoded = verifyToken(token) as { userId: string, role: string } | null;

            if (!decoded) {
                return res.status(401).json({ error: "Invalid token" });
            }

            // 3. Check Role
            if (allowedRoles && !allowedRoles.includes(decoded.role)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            // 4. Call Handler
            return handler(req, res, decoded);
        } catch (error) {
            console.error(error);
            return res.status(401).json({ error: "Invalid token" });
        }
    };
}
