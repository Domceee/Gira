import { redirect } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ApiFetchOptions = RequestInit & {
    cookie?: string;
}

export async function apiFetch(path: string, options: ApiFetchOptions ={}) {
    const { cookie, ...fetchOptions } = options;

    if (typeof window === "undefined") {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const forwardedCookie = cookie ?? cookieStore.toString();

        const response = await fetch(`${API_URL}${path}`, {
            ...fetchOptions,
            headers: {
                "Content-Type": "application/json",
                ...(forwardedCookie ? { "Cookie": forwardedCookie } : {}),
                ...(options.headers || {}),
            },
            cache: fetchOptions.cache ?? "no-store",
        });

        if (response.status === 401) {
            redirect("/");
        }

        return response;
    }

    return fetch(`/api/proxy${path}`, {
        ...fetchOptions,
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
