import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function extractAccessToken(setCookie: string | null) {
  if (!setCookie) {
    return null;
  }

  const match = setCookie.match(/(?:^|,\s*)access_token=([^;]+)/);
  return match ? match[1] : null;
}

export async function POST(request: NextRequest) {
  const body = await request.text();

  const backendResponse = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    cache: "no-store",
  });

  const responseText = await backendResponse.text();
  const response = new NextResponse(responseText, {
    status: backendResponse.status,
    headers: {
      "Content-Type": backendResponse.headers.get("content-type") || "application/json",
    },
  });

  if (!backendResponse.ok) {
    return response;
  }

  const accessToken = extractAccessToken(backendResponse.headers.get("set-cookie"));
  if (!accessToken) {
    return NextResponse.json({ detail: "Backend did not return access token" }, { status: 500 });
  }

  response.cookies.set({
    name: "access_token",
    value: accessToken,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60,
    path: "/",
  });

  return response;
}
