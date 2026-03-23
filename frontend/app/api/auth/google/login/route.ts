import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET() {
  return NextResponse.redirect(`${API_URL}/auth/google/login`);
}
