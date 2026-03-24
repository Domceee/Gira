"use client";

import { useState } from "react";

export default function CreateSprintForm({
  action,
  teamId,
  projectId,
}: {
  action: (formData: FormData) => Promise<void>;
  teamId: string;
  projectId: string;
}) {
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const startDate = String(formData.get("start_date") ?? "");
    const endDate = String(formData.get("end_date") ?? "");
    const today = new Date().toISOString().split("T")[0];

    if (startDate && endDate && endDate < startDate) {
      event.preventDefault();
      setError("End date must be on or after the start date.");
      return;
    }

    if (endDate && endDate < today) {
      event.preventDefault();
      setError("Sprint end date cannot be in the past.");
      return;
    }

    setError("");
  }

  return (
    <form
      action={action}
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-[#c8a27a] bg-[#fdf7f2] p-6"
    >
      <input type="hidden" name="team_id" value={teamId} />
      <input type="hidden" name="project_id" value={projectId} />

      <div>
        <label className="mb-1 block font-medium">Start Date</label>
        <input
          type="date"
          name="start_date"
          required
          className="w-full rounded-lg border border-[#c8a27a] p-3"
        />
      </div>

      <div>
        <label className="mb-1 block font-medium">End Date</label>
        <input
          type="date"
          name="end_date"
          required
          className="w-full rounded-lg border border-[#c8a27a] p-3"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="rounded-lg bg-[#b08968] px-6 py-3 font-semibold text-white hover:bg-[#8c6a4f]"
      >
        Create Sprint
      </button>
    </form>
  );
}
