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
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const res = await fetch(`${API_URL}/api${path}`, { ...options, headers });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
    }
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return res.json();
    return res.text();
}



