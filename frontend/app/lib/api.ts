const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ApiFetchOptions = RequestInit & {
    cookie?: string;
}

export async function apiFetch(path: string, options: ApiFetchOptions ={}) {
    const { cookie, ...fetchOptions } = options;

    return fetch(`${API_URL}${path}`, {
        ...fetchOptions,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(cookie ? { "Cookie": cookie } : {}),
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