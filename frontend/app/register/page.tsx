"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    country: "",
    city: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail ?? "Registration failed");
        return;
      }

      setOk(true);
      setForm({ name: "", email: "", password: "", country: "", city: "" });
      router.push("/login");
    } catch {
      setError("Could not reach the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5ede3] px-6 py-10 text-[#3e2a1f]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center justify-center">
        <section className="w-full max-w-xl rounded-2xl border border-[#b08968] bg-[#fffaf5] p-8 shadow-md">
          <header className="mb-6">
            <h1 className="text-3xl font-bold text-[#5c3b28]">
              Create account
            </h1>
            <p className="mt-2 text-sm text-[#6f4e37]">
              Join Gira — it takes less than a minute.
            </p>
          </header>

          <form onSubmit={onSubmit} className="space-y-4">
            <Field
              label="Name"
              placeholder="Your name"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
            />

            <Field
              label="Email"
              placeholder="you@example.com"
              type="email"
              required
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
            />

            <Field
              label="Password"
              placeholder="At least 8 characters"
              type="password"
              required
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Country"
                placeholder="Lithuania"
                value={form.country}
                onChange={(v) => setForm({ ...form, country: v })}
              />
              <Field
                label="City"
                placeholder="Vilnius"
                value={form.city}
                onChange={(v) => setForm({ ...form, city: v })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl border-2 border-[#8b5e3c] bg-[#a47148] px-4 py-3 text-sm font-bold text-white transition hover:scale-[1.01] hover:bg-[#8b5e3c] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Creating..." : "Create account"}
            </button>

            {error && (
              <div className="rounded-xl border border-[#d8b692] bg-[#fdf7f2] p-4 text-sm text-[#7b4b2a]">
                {error}
              </div>
            )}

            {ok && (
              <div className="rounded-xl border border-[#c8a27a] bg-[#fdf7f2] p-4 text-sm text-[#5a4335]">
                Registration successful! Redirecting...
              </div>
            )}
          </form>

          <footer className="mt-6 text-sm text-[#6f4e37]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-[#8b5e3c] transition hover:text-[#5c3b28]"
            >
              Log in
            </Link>
          </footer>
        </section>
      </div>
    </main>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#4b2e1f]">
        {props.label}
        {props.required ? " *" : ""}
      </span>

      <input
        type={props.type ?? "text"}
        required={props.required}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-xl border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3 text-sm text-[#3e2a1f] outline-none transition placeholder:text-[#8b6b4a] focus:border-[#8b5e3c] focus:ring-4 focus:ring-[#b08968]/20"
      />
    </label>
  );
}