"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
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
    } catch {
      setError("Could not reach the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background:
          "radial-gradient(1200px 800px at 30% 20%, #7a4b2a 0%, #5a351f 40%, #3f2415 100%)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 460,
          background: "white",
          borderRadius: 18,
          padding: 28,
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.12)",
          border: "1px solid rgba(90,53,31,0.12)",
        }}
      >
        <header style={{ marginBottom: 18 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              letterSpacing: -0.4,
              color: "#2b1a10",
            }}
          >
            Create account
          </h1>
          <p style={{ margin: "8px 0 0", color: "#6b4a3a", fontSize: 14 }}>
            Join Gira — it takes less than a minute.
          </p>
        </header>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
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

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
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
            style={{
              marginTop: 6,
              border: "none",
              borderRadius: 12,
              padding: "12px 14px",
              fontWeight: 700,
              fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer",
              background: loading ? "#a58c7c" : "#5a351f",
              color: "white",
              boxShadow: "0 10px 24px rgba(90,53,31,0.25)",
              transition: "transform 120ms ease, box-shadow 120ms ease",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(1px)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
          >
            {loading ? "Creating..." : "Create account"}
          </button>

          {error && (
            <div
              style={{
                marginTop: 6,
                padding: 12,
                borderRadius: 12,
                background: "rgba(185, 28, 28, 0.08)",
                border: "1px solid rgba(185, 28, 28, 0.18)",
                color: "#8a1f1f",
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          {ok && (
            <div
              style={{
                marginTop: 6,
                padding: 12,
                borderRadius: 12,
                background: "rgba(22, 163, 74, 0.08)",
                border: "1px solid rgba(22, 163, 74, 0.18)",
                color: "#14532d",
                fontSize: 14,
              }}
            >
              Registered! You can now{" "}
              <Link href="/login" style={{ color: "#5a351f", fontWeight: 700 }}>
                log in
              </Link>
              .
            </div>
          )}
        </form>

        <footer style={{ marginTop: 16, fontSize: 14, color: "#6b4a3a" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#5a351f", fontWeight: 700 }}>
            Log in
          </Link>
        </footer>
      </section>
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
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "#4a2c1a", fontWeight: 600 }}>
        {props.label}
        {props.required ? " *" : ""}
      </span>
      <input
        type={props.type ?? "text"}
        required={props.required}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "11px 12px",
          borderRadius: 12,
          border: "1px solid rgba(90,53,31,0.18)",
          outline: "none",
          fontSize: 14,
          color: "#2b1a10",
          background: "#fff",
          boxShadow: "inset 0 1px 0 rgba(0,0,0,0.03)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "rgba(90,53,31,0.55)";
          e.currentTarget.style.boxShadow =
            "0 0 0 4px rgba(90,53,31,0.12), inset 0 1px 0 rgba(0,0,0,0.03)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "rgba(90,53,31,0.18)";
          e.currentTarget.style.boxShadow =
            "inset 0 1px 0 rgba(0,0,0,0.03)";
        }}
      />
    </label>
  );
}