"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RiskAndPriority } from "@/app/lib/riskPriority";
import { apiFetch } from "@/app/lib/api";

type TaskDetailsTask = {
  id_task: number;
  name: string | null;
  description: string | null;
  story_points: number | null;
  risk: number | null;
  priority: number | null;
  fk_team_memberid_team_member?: number | null;
};

type AssignmentMember = {
  id_team_member: number;
  name: string;
};

type TaskDetailsModalProps = {
  task: TaskDetailsTask;
  members?: AssignmentMember[];
  onClose: () => void;
};

type TaskDetailsForm = {
  name: string;
  description: string;
  storyPoints: string;
  risk: string;
  priority: string;
  teamMemberId: string;
};

function getInitialForm(task: TaskDetailsTask): TaskDetailsForm {
  return {
    name: task.name ?? "",
    description: task.description ?? "",
    storyPoints: task.story_points === null ? "" : String(task.story_points),
    risk: task.risk === null ? "" : String(task.risk),
    priority: task.priority === null ? "" : String(task.priority),
    teamMemberId:
      task.fk_team_memberid_team_member === undefined || task.fk_team_memberid_team_member === null
        ? "null"
        : String(task.fk_team_memberid_team_member),
  };
}

function optionalNumber(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

export default function TaskDetailsModal({ task, members = [], onClose }: TaskDetailsModalProps) {
  const router = useRouter();
  const initialForm = useMemo(() => getInitialForm(task), [task]);
  const [form, setForm] = useState(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canAssignMember = members.length > 0 && task.fk_team_memberid_team_member !== undefined;

  const hasTaskChanges =
    form.name !== initialForm.name ||
    form.description !== initialForm.description ||
    form.storyPoints !== initialForm.storyPoints ||
    form.risk !== initialForm.risk ||
    form.priority !== initialForm.priority;
  const hasAssignmentChanges = canAssignMember && form.teamMemberId !== initialForm.teamMemberId;
  const canSave = (hasTaskChanges || hasAssignmentChanges) && form.name.trim().length > 0 && !isSaving;

  async function handleSave() {
    if (!canSave) return;

    setError(null);
    setIsSaving(true);

    try {
      if (hasTaskChanges) {
        const response = await apiFetch(`/api/tasks/${task.id_task}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: form.name,
            description: form.description.trim() === "" ? null : form.description,
            story_points: optionalNumber(form.storyPoints),
            risk: optionalNumber(form.risk),
            priority: optionalNumber(form.priority),
          }),
        });

        if (!response.ok) {
          setError("Task changes could not be saved.");
          return;
        }
      }

      if (hasAssignmentChanges) {
        const response = await apiFetch(`/api/tasks/${task.id_task}/assign_member`, {
          method: "PATCH",
          body: JSON.stringify({
            team_member_id: form.teamMemberId === "null" ? null : Number(form.teamMemberId),
          }),
        });

        if (!response.ok) {
          setError("Assignment changes could not be saved.");
          return;
        }
      }

      onClose();
      router.refresh();
    } catch {
      setError("Task could not be saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-xl border border-[#7a8798] bg-[#1f2630] p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#39e7ac]">Task Details</p>
            <h3 className="mt-1.5 text-xl font-bold text-[#ffffff]">{initialForm.name || "Untitled task"}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-1.5 text-xs text-[#edf3fb] transition hover:bg-[#323d4b] hover:text-[#ffffff]"
          >
            Close
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-2 text-sm text-[#ffffff] outline-none focus:border-[rgba(57,231,172,0.40)]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Description</span>
            <textarea
              value={form.description}
              rows={4}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-2 text-sm leading-6 text-[#ffffff] outline-none focus:border-[rgba(57,231,172,0.40)]"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Story Points</span>
              <input
                type="number"
                step="0.1"
                value={form.storyPoints}
                onChange={(event) => setForm((current) => ({ ...current, storyPoints: event.target.value }))}
                className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-2 text-sm text-[#ffffff] outline-none focus:border-[rgba(57,231,172,0.40)]"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Risk</span>
              <select
                value={form.risk}
                onChange={(event) => setForm((current) => ({ ...current, risk: event.target.value }))}
                className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-2 text-sm text-[#ffffff] outline-none focus:border-[rgba(57,231,172,0.40)]"
              >
                <option value="">Unspecified</option>
                {RiskAndPriority.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Priority</span>
              <select
                value={form.priority}
                onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
                className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-2 text-sm text-[#ffffff] outline-none focus:border-[rgba(57,231,172,0.40)]"
              >
                <option value="">Unspecified</option>
                {RiskAndPriority.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {canAssignMember && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Assignee</span>
              <select
                value={form.teamMemberId}
                onChange={(event) => setForm((current) => ({ ...current, teamMemberId: event.target.value }))}
                className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-2 text-sm text-[#ffffff] outline-none focus:border-[rgba(57,231,172,0.40)]"
              >
                <option value="null">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id_team_member} value={member.id_team_member}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-[#ff8080]">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-2 text-sm text-[#edf3fb] transition hover:bg-[#323d4b] hover:text-[#ffffff]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={handleSave}
            className="rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] px-4 py-2 text-sm font-bold text-[#39e7ac] transition hover:bg-[rgba(57,231,172,0.20)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
