import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.redirect(new URL("/main", request.url));
  const secureCookie = process.env.NODE_ENV === "production";
  response.cookies.set({
    name: "access_token",
    value: token,
    httpOnly: true,
    secure: secureCookie,
    sameSite: secureCookie ? "none" : "lax",
    maxAge: 60 * 60,
    path: "/",
  });

  return response;
}
