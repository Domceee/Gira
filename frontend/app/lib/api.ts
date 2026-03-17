const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiFetch(path: string, options: RequestInit ={}) {
    return fetch(`${API_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
    });
}

export async function getCurrentUser() {
    const res = await apiFetch("/auth/me", {
        method: "GET",
        cache: "no-store",
    });

    if (!res.ok) {
        return null;
    }

    return res.json();
}