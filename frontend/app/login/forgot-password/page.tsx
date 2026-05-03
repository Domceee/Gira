"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/navbar";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // Backend always returns OK even if email doesn't exist
      if (!res.ok) throw new Error("Failed to send reset email");

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
        <div className="mb-6">
          <Link href="/profile" className="text-sm text-[#c3ceda] hover:text-white transition">
            ← Back to Profile
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-6">Forgot Password</h1>

        {sent ? (
          <div className="rounded-lg border border-[rgba(57,231,172,0.25)] bg-[rgba(46,230,166,0.10)] p-4 text-[#39e7ac]">
            If an account with that email exists, a reset link has been sent.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm mb-1 text-[#c3ceda]">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-3 text-sm"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-[#ff4040]/30 bg-[#ff4040]/08 p-3 text-[#ff8080]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] py-2.5 font-bold text-[#39e7ac] hover:bg-[rgba(57,231,172,0.20)] disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
