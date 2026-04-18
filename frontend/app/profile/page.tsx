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
  const [saved, setSaved] = useState(false);

  async function fetchUser() {
    try {
      setError(null);
      const res = await fetch(`/api/proxy/auth/me`, { credentials: "include", cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Failed to fetch user");
      }
      setUser(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch user");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUser(); }, []);

  async function handlePictureChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) { setError("Failed to process image"); return; }
      const MAX_WIDTH = 512;
      const scale = MAX_WIDTH / img.width;
      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setPictureBase64(canvas.toDataURL("image/jpeg", 0.7).split(",")[1]);
    };
    img.onerror = () => setError("Failed to load image");
  }

  async function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
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
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Failed to update profile");
      }
      await fetchUser();
      setPictureBase64(null);
      setSaved(true);
      const fileInput = form.querySelector('input[name="picture"]') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#080808] text-[#f0f0f0]">
      <Navbar />
      <p className="p-6 text-[#555]">Loading...</p>
    </div>
  );

  if (error && !user) return (
    <div className="min-h-screen bg-[#080808] text-[#f0f0f0]">
      <Navbar />
      <p className="p-6 text-[#ff8080]">{error}</p>
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#080808] text-[#f0f0f0]">
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/main" className="text-sm text-[#555] hover:text-[#f0f0f0] transition-colors">← Dashboard</Link>
        </div>

        <div className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-8">
          <h1 className="mb-6 text-xl font-bold text-[#f0f0f0]">Profile Settings</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Picture */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#555]">Profile Picture</label>
              <div className="mb-3 flex items-center gap-4">
                {pictureBase64 ? (
                  <img src={`data:image/jpeg;base64,${pictureBase64}`} alt="Preview" className="h-16 w-16 rounded-lg object-cover border border-[#1e1e1e]" />
                ) : user.picture ? (
                  <img src={`data:image/jpeg;base64,${user.picture}`} alt="Profile" className="h-16 w-16 rounded-lg object-cover border border-[#1e1e1e]" />
                ) : (
                  <img src="/default.jpg" alt="Default" className="h-16 w-16 rounded-lg object-cover border border-[#1e1e1e]" />
                )}
              </div>
              <input type="file" name="picture" accept="image/*" onChange={handlePictureChange}
                className="w-full rounded-lg border border-[#1e1e1e] bg-[#111] p-2.5 text-sm text-[#888] file:mr-3 file:rounded file:border-0 file:bg-[#1e1e1e] file:px-3 file:py-1 file:text-xs file:text-[#ccc]" />
            </div>

            <Field label="Name" name="name" defaultValue={user.name} required />
            <Field label="Email" name="email" type="email" defaultValue={user.email} required />
            <Field label="Country" name="country" defaultValue={user.country} />
            <Field label="City" name="city" defaultValue={user.city} />
            <Field label="New Password" name="password" type="password" placeholder="Leave empty to keep current password" />

            {error && <div className="rounded-lg border border-[#ff4040]/30 bg-[#ff4040]/08 px-4 py-3 text-sm text-[#ff8080]">{error}</div>}
            {saved && <div className="rounded-lg border border-[rgba(57,255,20,0.2)] bg-[rgba(57,255,20,0.06)] px-4 py-3 text-sm text-[#39ff14]">Changes saved.</div>}

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg border border-[rgba(57,255,20,0.3)] bg-[rgba(57,255,20,0.08)] px-6 py-2.5 text-sm font-bold text-[#39ff14] transition hover:bg-[rgba(57,255,20,0.14)] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

function Field(props: { label: string; name: string; defaultValue?: string; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#555]">
        {props.label}{props.required ? " *" : ""}
      </label>
      <input
        type={props.type ?? "text"}
        name={props.name}
        defaultValue={props.defaultValue}
        required={props.required}
        placeholder={props.placeholder}
        className="w-full rounded-lg border border-[#1e1e1e] bg-[#111] px-4 py-3 text-sm text-[#f0f0f0] outline-none transition placeholder:text-[#333] focus:border-[rgba(57,255,20,0.3)] focus:ring-2 focus:ring-[rgba(57,255,20,0.1)]"
      />
    </div>
  );
}
