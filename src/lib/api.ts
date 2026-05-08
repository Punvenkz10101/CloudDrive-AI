import { API_URL } from './config';

export function getAuthToken(): string | null {
    try {
        return localStorage.getItem('cdai_token');
    } catch {
        return null;
    }
}

export function setAuthToken(token: string) {
    localStorage.setItem('cdai_token', token);
}

export async function apiFetch(path: string, options: RequestInit = {}) {
    const token = getAuthToken();
    const adminToken = localStorage.getItem('adminToken');
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (adminToken === 'true') headers.set('X-User-Id', 'admin');
    const res = await fetch(`${API_URL}/api${path}`, { ...options, headers });
    
    // Check for security blocks (Zero Trust enforcement)
    // EXEMPT ADMIN: Don't force logout for admin portal users
    if ((res.status === 403 || res.status === 429) && adminToken !== 'true') {
        const cloned = res.clone();
        try {
            const data = await cloned.json();
            if (data.code === 'MALICIOUS_DETECTED' || data.code === 'USER_BLOCKED' || data.code === 'RATE_LIMIT_EXCEEDED') {
                // Dispatch global event for App.tsx to catch
                window.dispatchEvent(new CustomEvent('sec-zero-trust-enforced', { detail: data }));
            }
        } catch(e) {}
    }

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
    }
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return res.json();
    return res.text();
}



