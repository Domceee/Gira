"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    <main className="min-h-screen bg-[#171c24] px-6 py-10 text-[#ffffff]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center justify-center">
        <section className="w-full max-w-md rounded-xl border border-[#7a8798] bg-[#1f2630] p-8">
          <header className="mb-6">
            <p className="mb-2 text-[#39e7ac] text-xs font-bold uppercase tracking-widest">Gira</p>
            <h1 className="text-2xl font-bold text-[#ffffff]">Welcome back</h1>
            <p className="mt-1 text-sm text-[#c3ceda]">Log in to continue.</p>
          </header>

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Email" placeholder="you@example.com" type="email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Field label="Password" placeholder="Your password" type="password" required value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
            <Link
              href="/login/forgot-password"
              className="block text-right text-sm text-[#39e7ac] hover:underline"
            >
              Forgot your password?
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] px-4 py-3 text-sm font-bold text-[#39e7ac] transition hover:bg-[rgba(57,231,172,0.20)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>

            <button
              type="button"
              onClick={() => { window.location.href = "/api/auth/google/login"; }}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-[#7a8798] bg-[#28313d] px-6 py-3 text-sm font-medium text-[#f7faff] transition hover:bg-[#323d4b] hover:text-[#ffffff]"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.233 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4c-7.682 0-14.344 4.337-17.694 10.691z" />
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.144 35.091 26.679 36 24 36c-5.212 0-9.62-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.05 12.05 0 0 1-4.084 5.571h.003l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
              </svg>
              Continue with Google
            </button>

            {error && <div className="rounded-lg border border-[#ff4040]/30 bg-[#ff4040]/08 px-4 py-3 text-sm text-[#ff8080]">{error}</div>}
            {ok && <div className="rounded-lg border border-[rgba(57,231,172,0.25)] bg-[rgba(46,230,166,0.10)] px-4 py-3 text-sm text-[#39e7ac]">Login successful! Redirecting...</div>}
          </form>

          <footer className="mt-6 text-sm text-[#c3ceda]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-[#39e7ac] transition hover:opacity-80">Create one</Link>
          </footer>
        </section>
      </div>
    </main>
  );
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">
        {props.label}{props.required ? " *" : ""}
      </span>
      <input
        type={props.type ?? "text"}
        required={props.required}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-3 text-sm text-[#ffffff] outline-none transition placeholder:text-[#93a0b1] focus:border-[rgba(57,231,172,0.40)] focus:ring-2 focus:ring-[rgba(57,231,172,0.16)]"
      />
    </label>
  );
}

