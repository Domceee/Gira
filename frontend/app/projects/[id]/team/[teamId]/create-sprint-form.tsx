"use client";

import { useState } from "react";

type Sprint = { id_sprint: number; start_date: string; end_date: string; status: "PLANNED" | "ACTIVE" | "COMPLETED" };

export default function CreateSprintForm({ action, teamId, projectId, existingSprints = [] }: {
  action: (formData: FormData) => Promise<void>;
  teamId: string;
  projectId: string;
  existingSprints?: Sprint[];
}) {
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("");

  function calculateEndDate(start: string, weeks: string): string | null {
    if (!start || !weeks) return null;
    const d = new Date(start + "T00:00:00Z");
    const w = parseInt(weeks, 10);
    if (isNaN(w) || w <= 0) return null;
    d.setDate(d.getDate() + w * 7);
    return d.toISOString().split("T")[0];
  }

  function hasOverlap(newStart: string, newEnd: string): Sprint | null {
    const norm = (s: string) => s.split("T")[0];
    for (const s of existingSprints.filter((s) => s.status === "ACTIVE" || s.status === "PLANNED")) {
      const doesNotOverlap = norm(newEnd) < norm(s.start_date) || norm(newStart) >= norm(s.end_date);
      if (!doesNotOverlap) return s;
    }
    return null;
  }

  function handleSubmit(e: React.BaseSyntheticEvent) {
    const endDate = calculateEndDate(startDate, durationWeeks);
    const today = new Date().toISOString().split("T")[0];
    if (!startDate || !durationWeeks) { e.preventDefault(); setError("Please fill in all fields."); return; }
    const weeks = parseInt(durationWeeks, 10);
    if (isNaN(weeks) || weeks <= 0) { e.preventDefault(); setError("Duration must be a positive number of weeks."); return; }
    if (startDate < today) { e.preventDefault(); setError("Sprint start date cannot be in the past."); return; }
    if (endDate && endDate < today) { e.preventDefault(); setError("Sprint end date cannot be in the past."); return; }
    if (endDate) {
      const overlap = hasOverlap(startDate, endDate);
      if (overlap) { e.preventDefault(); setError(`Overlaps with ${overlap.status.toLowerCase()} sprint (${overlap.start_date} → ${overlap.end_date}).`); return; }
    }
    setError("");
  }

  const calculatedEndDate = calculateEndDate(startDate, durationWeeks);

  return (
    <form action={action} onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-[#7a8798] bg-[#1f2630] p-6">
      <input type="hidden" name="team_id" value={teamId} />
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="end_date" value={calculatedEndDate || ""} />

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Start Date</label>
        <input type="date" name="start_date" required value={startDate} onChange={(e) => setStartDate(e.target.value)}
          className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-3 text-sm text-[#ffffff] outline-none focus:border-[rgba(57,231,172,0.40)]" />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Duration (Weeks)</label>
        <input type="number" name="duration_weeks" required min="1" value={durationWeeks} onChange={(e) => setDurationWeeks(e.target.value)} placeholder="e.g. 2"
          className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-3 text-sm text-[#ffffff] outline-none focus:border-[rgba(57,231,172,0.40)]" />
      </div>

      {calculatedEndDate && (
        <div className="rounded-lg border border-[rgba(57,231,172,0.22)] bg-[rgba(57,231,172,0.10)] px-4 py-3 text-sm text-[#39e7ac]">
          End Date: <strong>{calculatedEndDate}</strong>
        </div>
      )}

      {error && <p className="rounded-lg border border-[#ff4040]/20 bg-[#ff4040]/05 px-4 py-3 text-sm text-[#ff8080]">{error}</p>}

      <button type="submit" className="rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] px-5 py-2.5 text-sm font-bold text-[#39e7ac] transition hover:bg-[rgba(57,231,172,0.20)]">
        Create Sprint
      </button>
    </form>
  );
}
