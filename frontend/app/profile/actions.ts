"use server";

import { cookies } from "next/headers";

export async function updateProfile(formData: FormData) {
  const name = formData.get("name");
  const email = formData.get("email");
  const country = formData.get("country");
  const city = formData.get("city");
  const password = formData.get("password");
  const picture = formData.get("picture_base64");

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      name,
      email,
      country,
      city,
      password: password || undefined,
      picture,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to update profile");
  }

  return res.json();
}