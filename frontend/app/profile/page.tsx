"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/navbar";


interface User {
  id_user: number;
  name: string;
  email: string;
  country: string;
  city: string;
  picture?: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pictureBase64, setPictureBase64] = useState<string | null>(null);

  async function fetchUser() {
    try {
      setError(null);

      const res = await fetch(`/api/proxy/auth/me`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Failed to fetch user");
      }

      const data = await res.json();
      setUser(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch user");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUser();
  }, []);

async function handlePictureChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.currentTarget.files?.[0];
  if (!file) return;

  // Load image into HTMLImageElement
  const img = new Image();
  img.src = URL.createObjectURL(file);

  img.onload = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      setError("Failed to process image");
      return;
    }

    // Resize logic (max width 512px)
    const MAX_WIDTH = 512;
    const scale = MAX_WIDTH / img.width;
    canvas.width = MAX_WIDTH;
    canvas.height = img.height * scale;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Compress to JPEG at 70% quality
    const compressed = canvas.toDataURL("image/jpeg", 0.7);

    // Remove prefix
    const base64 = compressed.split(",")[1];
    setPictureBase64(base64);
  };

  img.onerror = () => {
    setError("Failed to load image");
  };
}


async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setSaving(true);
  setError(null);

  const form = e.currentTarget;
  const formData = new FormData(form);

  const payload = {
    name: formData.get("name"),
    email: formData.get("email"),
    country: formData.get("country"),
    city: formData.get("city"),
    password: formData.get("password") || null,
    picture: pictureBase64 || null,
  };

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail ?? "Failed to update profile");
    }

    await fetchUser();
    setPictureBase64(null);

    const fileInput = form.querySelector('input[name="picture"]') as HTMLInputElement;
    if (fileInput) fileInput.value = "";

  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to update profile");
  } finally {
    setSaving(false);
  }
}




  if (loading) return <p className="p-6">Loading...</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!user) return <p className="p-6 text-red-600">User not found</p>;

  return (
    <div className="min-h-screen bg-[#f5ede3] text-[#3e2a1f]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid grid-cols-[260px_1fr] gap-8">
          {/* LEFT SIDEBAR */}
          <aside className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-6 shadow-md">
            <h2 className="mb-6 text-2xl font-bold text-[#5c3b28]">Menu</h2>

            <div className="space-y-4">
              <Link
                href="/main"
                className="block w-full rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3 text-left font-medium text-[#4b2e1f] transition hover:-translate-y-1 hover:shadow"
              >
                ← Back
              </Link>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <div className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-8 shadow-md">
            <h2 className="mb-6 text-2xl font-bold text-[#5c3b28]">
              Profile Settings
            </h2>

            <form
              onSubmit={handleSubmit}
              className="space-y-6 rounded-xl border border-[#c8a27a] bg-[#fdf7f2] p-6"
            >
              {/* PROFILE PICTURE */}
              <div>
                <label className="mb-1 block font-medium">Profile Picture</label>
                <div className="mb-3 flex items-center gap-4">
                  {pictureBase64 ? (
                    <img
                      src={`data:image/jpeg;base64,${pictureBase64}`}
                      alt="Preview"
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  ) : user.picture ? (
                    <img
                      src={`data:image/jpeg;base64,${user.picture}`}
                      alt="Profile"
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  ) : (
                    <img
                      src="/default.jpg"
                      alt="Default Profile"
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  )}
                </div>
                <input
                  type="file"
                  name="picture"
                  accept="image/*"
                  onChange={handlePictureChange}
                  className="w-full rounded-lg border border-[#c8a27a] p-3"
                />
              </div>

              {/* NAME */}
              <div>
                <label className="mb-1 block font-medium">Name</label>
                <input
                  name="name"
                  defaultValue={user.name}
                  required
                  className="w-full rounded-lg border border-[#c8a27a] p-3"
                />
              </div>

              {/* EMAIL */}
              <div>
                <label className="mb-1 block font-medium">Email</label>
                <input
                  type="email"
                  name="email"
                  defaultValue={user.email}
                  required
                  className="w-full rounded-lg border border-[#c8a27a] p-3"
                />
              </div>

              {/* COUNTRY */}
              <div>
                <label className="mb-1 block font-medium">Country</label>
                <input
                  name="country"
                  defaultValue={user.country}
                  className="w-full rounded-lg border border-[#c8a27a] p-3"
                />
              </div>

              {/* CITY */}
              <div>
                <label className="mb-1 block font-medium">City</label>
                <input
                  name="city"
                  defaultValue={user.city}
                  className="w-full rounded-lg border border-[#c8a27a] p-3"
                />
              </div>

              {/* PASSWORD */}
              <div>
                <label className="mb-1 block font-medium">New Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Leave empty to keep current password"
                  className="w-full rounded-lg border border-[#c8a27a] p-3"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#b08968] px-6 py-3 font-semibold text-white hover:bg-[#8c6a4f] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
