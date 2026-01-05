const API_BASE = (import.meta as any).env.VITE_API_BASE_URL as string;

if (!API_BASE) {
    console.warn('VITE_API_BASE_URL is not defined. API calls may fail.');
}

/**
 * Wrapper around fetch to ensure correct Base URL and Credentials
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
    // Ensure endpoint starts with / if not present (unless it's a full URL which we shouldn't pass here ideally)
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    const url = `${API_BASE}${path}`;

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    const config: RequestInit = {
        ...options,
        headers,
        credentials: 'include', // CRITICAL for cookies cross-origin
    };

    return fetch(url, config);
}
