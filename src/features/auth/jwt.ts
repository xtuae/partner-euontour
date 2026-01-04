import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-me';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'dev-refresh-secret-key-change-me';

export function signToken(payload: object) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' }); // Short lived access token
}

export function signRefreshToken(payload: object) {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' }); // Long lived refresh token
}

export function verifyToken(token: string) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

export function verifyRefreshToken(token: string) {
    try {
        return jwt.verify(token, REFRESH_SECRET);
    } catch (error) {
        return null;
    }
}
