"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "../lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    setLoading(true);

    try {
      const res = await apiFetch(`/auth/login`, {
          method: "POST",
          body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail ?? "Login failed");
        return;
      }

      setOk(true);
      setForm({ email: "", password: "" });
      router.push("/main");
    } catch {
      setError("Could not reach the server. Check if backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5ede3] px-6 py-10 text-[#3e2a1f]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center justify-center">
        <section className="w-full max-w-md rounded-2xl border border-[#b08968] bg-[#fffaf5] p-8 shadow-md">
          <header className="mb-6">
            <h1 className="text-3xl font-bold text-[#5c3b28]">Welcome back</h1>
            <p className="mt-2 text-sm text-[#6f4e37]">
              Log in to continue using Gira.
            </p>
          </header>

          <form onSubmit={onSubmit} className="space-y-4">
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
              placeholder="Your password"
              type="password"
              required
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl border-2 border-[#8b5e3c] bg-[#a47148] px-4 py-3 text-sm font-bold text-white transition hover:scale-[1.01] hover:bg-[#8b5e3c] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google/login`;
              }}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-6 py-3 font-medium text-[#4b2e1f] transition hover:-translate-y-1 hover:shadow"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.233 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4c-7.682 0-14.344 4.337-17.694 10.691z" />
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.144 35.091 26.679 36 24 36c-5.212 0-9.62-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.05 12.05 0 0 1-4.084 5.571h.003l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
              </svg>

              <span>Continue with Google</span>
            </button>

            {error && (
              <div className="rounded-xl border border-[#d8b692] bg-[#fdf7f2] p-4 text-sm text-[#7b4b2a]">
                {error}
              </div>
            )}

            {ok && (
              <div className="rounded-xl border border-[#c8a27a] bg-[#fdf7f2] p-4 text-sm text-[#5a4335]">
                Login successful! Redirecting...
              </div>
            )}
          </form>

          <footer className="mt-6 text-sm text-[#6f4e37]">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-bold text-[#8b5e3c] transition hover:text-[#5c3b28]"
            >
              Create one
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