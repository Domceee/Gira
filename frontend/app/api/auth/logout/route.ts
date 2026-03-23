import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") || "";

  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    cache: "no-store",
  }).catch(() => null);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: "access_token",
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });

  return response;
}
