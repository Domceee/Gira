"use client";

import { useState } from "react";

type Sprint = {
  id_sprint: number;
  start_date: string;
  end_date: string;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
};

export default function CreateSprintForm({
  action,
  teamId,
  projectId,
  existingSprints = [],
}: {
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
    const startDateObj = new Date(start + "T00:00:00Z");
    const weeksDuration = parseInt(weeks, 10);
    if (isNaN(weeksDuration) || weeksDuration <= 0) return null;
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(endDateObj.getDate() + weeksDuration * 7);
    return endDateObj.toISOString().split("T")[0];
  }

  function hasOverlap(newStart: string, newEnd: string): Sprint | null {
    const activeAndPlanned = existingSprints.filter(
      (s) => s.status === "ACTIVE" || s.status === "PLANNED"
    );

    // Normalize dates to just the date part (YYYY-MM-DD) for comparison
    const normalizeDate = (dateStr: string) => dateStr.split("T")[0];
    const normalizedNewStart = normalizeDate(newStart);
    const normalizedNewEnd = normalizeDate(newEnd);

    for (const sprint of activeAndPlanned) {
      const sprintStart = normalizeDate(sprint.start_date);
      const sprintEnd = normalizeDate(sprint.end_date);

      // No overlap if: new sprint ends before existing starts, OR new sprint starts on/after existing ends
      // This allows sprints to share a boundary date (end of one = start of another)
      const doesNotOverlap = normalizedNewEnd < sprintStart || normalizedNewStart >= sprintEnd;
      if (!doesNotOverlap) {
        return sprint;
      }
    }
    return null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const endDate = calculateEndDate(startDate, durationWeeks);
    const today = new Date().toISOString().split("T")[0];

    if (!startDate || !durationWeeks) {
      event.preventDefault();
      setError("Please fill in all fields.");
      return;
    }

    const weeks = parseInt(durationWeeks, 10);
    if (isNaN(weeks) || weeks <= 0) {
      event.preventDefault();
      setError("Duration must be a positive number of weeks.");
      return;
    }

    if (startDate < today) {
      event.preventDefault();
      setError("Sprint start date cannot be in the past.");
      return;
    }

    if (endDate && endDate < today) {
      event.preventDefault();
      setError("Sprint end date cannot be in the past.");
      return;
    }

    // Check for overlaps
    if (endDate) {
      const overlappingSprint = hasOverlap(startDate, endDate);
      if (overlappingSprint) {
        event.preventDefault();
        const sprintType = overlappingSprint.status.toLowerCase();
        setError(
          `This sprint overlaps with ${sprintType} sprint (${overlappingSprint.start_date} to ${overlappingSprint.end_date}). Please choose different dates.`
        );
        return;
      }
    }

    setError("");
  }

  const calculatedEndDate = calculateEndDate(startDate, durationWeeks);

  return (
    <form
      action={action}
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-[#c8a27a] bg-[#fdf7f2] p-6"
    >
      <input type="hidden" name="team_id" value={teamId} />
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="end_date" value={calculatedEndDate || ""} />

      <div>
        <label className="mb-1 block font-medium">Start Date</label>
        <input
          type="date"
          name="start_date"
          required
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full rounded-lg border border-[#c8a27a] p-3"
        />
      </div>

      <div>
        <label className="mb-1 block font-medium">Duration (Weeks)</label>
        <input
          type="number"
          name="duration_weeks"
          required
          min="1"
          value={durationWeeks}
          onChange={(e) => setDurationWeeks(e.target.value)}
          placeholder="e.g., 2"
          className="w-full rounded-lg border border-[#c8a27a] p-3"
        />
      </div>

      {calculatedEndDate && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <p className="text-sm text-blue-800">
            <strong>End Date:</strong> {calculatedEndDate}
          </p>
        </div>
      )}

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
