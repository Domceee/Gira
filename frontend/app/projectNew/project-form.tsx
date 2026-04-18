"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";

export default function NewProjectForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim() || [".", "..", "..."].includes(name.trim())) {
      setError("Please enter a valid project name.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await apiFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = data?.detail || data?.message || "Failed to create project";
        throw new Error(message);
      }

      router.push("/main");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#555]">
          Project name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter project name"
          className="w-full rounded-lg border border-[#1e1e1e] bg-[#111] px-4 py-3 text-sm text-[#f0f0f0] outline-none focus:border-[rgba(57,255,20,0.3)]"
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#555]">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter project description"
          rows={5}
          className="w-full rounded-lg border border-[#1e1e1e] bg-[#111] px-4 py-3 text-sm text-[#f0f0f0] outline-none focus:border-[rgba(57,255,20,0.3)]"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-[#ff4040]/20 bg-[#ff4040]/05 px-4 py-3 text-sm text-[#ff8080]">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg border border-[rgba(57,255,20,0.3)] bg-[rgba(57,255,20,0.08)] px-6 py-3 text-sm font-bold text-[#39ff14] transition hover:bg-[rgba(57,255,20,0.14)] disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Project"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/main")}
          className="rounded-lg border border-[#1e1e1e] px-6 py-3 text-sm font-semibold text-[#888] transition hover:bg-[#161616] hover:text-[#f0f0f0]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
