"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ResetPasswordFormProps {
  token: string | null;
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token");
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Missing reset token");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            new_password: password,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to reset password");

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <Link
        href="/login"
        className="text-sm text-[#c3ceda] hover:text-white transition"
      >
        ← Back to Login
      </Link>

      <h1 className="text-2xl font-bold mt-6 mb-4">Set New Password</h1>

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-[#ff4040]/30 bg-[#ff4040]/08 p-3 text-[#ff8080]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm mb-1 text-[#c3ceda]">
              New Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-[#c3ceda]">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-3 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] py-2.5 font-bold text-[#39e7ac] hover:bg-[rgba(57,231,172,0.20)] disabled:opacity-50"
          >
            {loading ? "Saving..." : "Reset Password"}
          </button>
        </form>
      )}

      {success && (
        <div className="rounded-lg border border-[rgba(57,231,172,0.25)] bg-[rgba(46,230,166,0.10)] p-4 text-[#39e7ac] space-y-3">
          <p>Your password has been reset successfully.</p>
          <Link
            href="/login"
            className="underline text-[#39e7ac] hover:text-[#5fffc7]"
          >
            Go to Login
          </Link>
        </div>
      )}
    </main>
  );
}
