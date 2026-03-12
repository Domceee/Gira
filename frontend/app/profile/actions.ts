"use server";

import { redirect } from "next/navigation";

export async function updateProfile(formData: FormData) {
  const id_user = formData.get("id_user");
  const name = formData.get("name");
  const email = formData.get("email");
  const country = formData.get("country");
  const city = formData.get("city");
  const password = formData.get("password");

  await fetch(`http://localhost:8000/api/user/${id_user}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      email,
      country,
      city,
      password: password || undefined,
    }),
  });

}