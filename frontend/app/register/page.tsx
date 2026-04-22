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
    <main className="min-h-screen bg-[#171c24] px-6 py-10 text-[#ffffff]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center justify-center">
        <section className="w-full max-w-xl rounded-xl border border-[#7a8798] bg-[#1f2630] p-8">
          <header className="mb-6">
            <p className="mb-2 text-[#39e7ac] text-xs font-bold uppercase tracking-widest">Gira</p>
            <h1 className="text-2xl font-bold text-[#ffffff]">Create account</h1>
            <p className="mt-1 text-sm text-[#c3ceda]">Join Gira — it takes less than a minute.</p>
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
              className="w-full rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] px-4 py-3 text-sm font-bold text-[#39e7ac] transition hover:bg-[rgba(57,231,172,0.20)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create account"}
            </button>

            {error && <div className="rounded-lg border border-[#ff4040]/30 bg-[#ff4040]/08 px-4 py-3 text-sm text-[#ff8080]">{error}</div>}
            {ok && <div className="rounded-lg border border-[rgba(57,231,172,0.25)] bg-[rgba(46,230,166,0.10)] px-4 py-3 text-sm text-[#39e7ac]">Registration successful! Redirecting...</div>}
          </form>

          <footer className="mt-6 text-sm text-[#c3ceda]">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#39e7ac] transition hover:opacity-80">Log in</Link>
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

