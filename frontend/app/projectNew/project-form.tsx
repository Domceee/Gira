"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import { Toaster } from "react-hot-toast";

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
      <Toaster />
      <div>
        <label htmlFor="name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">
          Project name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter project name"
          className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-3 text-sm text-[#ffffff] outline-none focus:border-[rgba(57,231,172,0.40)]"
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter project description"
          rows={5}
          className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-3 text-sm text-[#ffffff] outline-none focus:border-[rgba(57,231,172,0.40)]"
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
          className="rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] px-6 py-3 text-sm font-bold text-[#39e7ac] transition hover:bg-[rgba(57,231,172,0.20)] disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Project"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/main")}
          className="rounded-lg border border-[#7a8798] px-6 py-3 text-sm font-semibold text-[#edf3fb] transition hover:bg-[#323d4b] hover:text-[#ffffff]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

