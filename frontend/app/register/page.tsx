"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", country: "", city: "" });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    setLoading(true);
    try {
      const res = await apiFetch(`/auth/register`, { method: "POST", body: JSON.stringify(form) });
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
    <main className="min-h-screen bg-[#080808] px-6 py-10 text-[#f0f0f0]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center justify-center">
        <section className="w-full max-w-xl rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-8">
          <header className="mb-6">
            <p className="mb-2 text-[#39ff14] text-xs font-bold uppercase tracking-widest">Gira</p>
            <h1 className="text-2xl font-bold text-[#f0f0f0]">Create account</h1>
            <p className="mt-1 text-sm text-[#555]">Join Gira — it takes less than a minute.</p>
          </header>

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Name" placeholder="Your name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="Email" placeholder="you@example.com" type="email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Field label="Password" placeholder="At least 8 characters" type="password" required value={form.password} onChange={(v) => setForm({ ...form, password: v })} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Country" placeholder="Lithuania" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
              <Field label="City" placeholder="Vilnius" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg border border-[rgba(57,255,20,0.3)] bg-[rgba(57,255,20,0.08)] px-4 py-3 text-sm font-bold text-[#39ff14] transition hover:bg-[rgba(57,255,20,0.14)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create account"}
            </button>

            {error && <div className="rounded-lg border border-[#ff4040]/30 bg-[#ff4040]/08 px-4 py-3 text-sm text-[#ff8080]">{error}</div>}
            {ok && <div className="rounded-lg border border-[rgba(57,255,20,0.2)] bg-[rgba(57,255,20,0.06)] px-4 py-3 text-sm text-[#39ff14]">Registration successful! Redirecting...</div>}
          </form>

          <footer className="mt-6 text-sm text-[#555]">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#39ff14] transition hover:opacity-80">Log in</Link>
          </footer>
        </section>
      </div>
    </main>
  );
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#555]">
        {props.label}{props.required ? " *" : ""}
      </span>
      <input
        type={props.type ?? "text"}
        required={props.required}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-lg border border-[#1e1e1e] bg-[#111] px-4 py-3 text-sm text-[#f0f0f0] outline-none transition placeholder:text-[#333] focus:border-[rgba(57,255,20,0.3)] focus:ring-2 focus:ring-[rgba(57,255,20,0.1)]"
      />
    </label>
  );
}
