import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type AuthUser = {
  id_user: number;
  name: string;
  email: string;
  country: string | null;
  city: string | null;
};

// Returns the authenticated user, or null if the session is invalid/missing.
export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (!cookieHeader.includes("access_token=")) return null;

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Use at the top of any protected server page.
// Redirects to "/" if the user is not authenticated, otherwise returns the user.
export async function requireAuth(): Promise<AuthUser> {
  const user = await getSession();
  if (!user) redirect("/");
  return user;
}
