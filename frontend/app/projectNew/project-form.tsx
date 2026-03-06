"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("http://localhost:8000/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to create project");
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
        <label
          htmlFor="name"
          className="mb-2 block text-sm font-semibold text-[#4b2e1f]"
        >
          Project name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter project name"
          className="w-full rounded-xl border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3 text-[#3e2a1f] outline-none transition focus:border-[#8b5e3c] focus:ring-2 focus:ring-[#d8b692]"
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="mb-2 block text-sm font-semibold text-[#4b2e1f]"
        >
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter project description"
          rows={5}
          className="w-full rounded-xl border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3 text-[#3e2a1f] outline-none transition focus:border-[#8b5e3c] focus:ring-2 focus:ring-[#d8b692]"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-[#8b5e3c] px-6 py-3 font-semibold text-white transition hover:bg-[#734c30] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating..." : "Create Project"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/main")}
          className="rounded-xl border border-[#8b5e3c] px-6 py-3 font-semibold text-[#8b5e3c] transition hover:bg-[#f3e4d6]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}