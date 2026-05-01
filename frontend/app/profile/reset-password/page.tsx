"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/navbar";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch(`/api/proxy/auth/me`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load user");
        const user = await res.json();
        setEmail(user.email);
      } catch {
        setError("Failed to load your account");
      }
    }
    loadUser();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error("Failed to send reset link");

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#171c24] text-white">
      <Navbar />

      <main className="mx-auto max-w-md px-6 py-12">
        <Link href="/profile" className="text-sm text-[#c3ceda] hover:text-white transition">
          ← Back to Profile
        </Link>

        <h1 className="text-2xl font-bold mt-6 mb-4">Reset Password</h1>

        {!email && !error && <p className="text-[#c3ceda]">Loading your account…</p>}

        {error && (
          <div className="rounded-lg border border-[#ff4040]/30 bg-[#ff4040]/08 p-3 text-[#ff8080]">
            {error}
          </div>
        )}

        {email && !sent && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-sm text-[#c3ceda]">
              A reset link will be sent to:
              <br />
              <span className="text-white font-semibold">{email}</span>
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] py-2.5 font-bold text-[#39e7ac] hover:bg-[rgba(57,231,172,0.20)] disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        {sent && (
          <div className="rounded-lg border border-[rgba(57,231,172,0.25)] bg-[rgba(46,230,166,0.10)] p-4 text-[#39e7ac]">
            If an account with this email exists, a reset link has been sent.
          </div>
        )}
      </main>
    </div>
  );
}
