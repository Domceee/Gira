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

  multiplePeople: boolean;        // NEW
  assignees?: number[];           // NEW
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

  // NEW — local task state for multi-assignee features
const [localTask, setLocalTask] = useState({
  multiplePeople: task.multiplePeople ?? false,
  assignees: task.assignees ?? [],
});

function updateTask(patch: Partial<typeof localTask>) {
  setLocalTask(prev => ({ ...prev, ...patch }));
}


  const hasTaskChanges =
    form.name !== initialForm.name ||
    form.description !== initialForm.description ||
    form.storyPoints !== initialForm.storyPoints ||
    form.risk !== initialForm.risk ||
    form.priority !== initialForm.priority;
  const hasAssignmentChanges = canAssignMember && form.teamMemberId !== initialForm.teamMemberId;

  const hasMultiPeopleToggleChange =
  localTask.multiplePeople !== task.multiplePeople &&
  (localTask.multiplePeople === false || localTask.assignees.length > 0);


  const hasMultiAssigneeChanges =
    JSON.stringify(localTask.assignees ?? []) !==
    JSON.stringify(task.assignees ?? []);



  const canSave =
  (
    hasTaskChanges ||
    hasAssignmentChanges ||
    hasMultiPeopleToggleChange ||
    hasMultiAssigneeChanges
  ) &&
  form.name.trim().length > 0 &&
  !isSaving;


  async function handleSave() {
    if (!canSave) return;

    setError(null);
    setIsSaving(true);

    try {
      // 1. Prepare the payload for the main task update
      const taskBody = {
        name: form.name,
        description: form.description.trim() === "" ? null : form.description,
        story_points: optionalNumber(form.storyPoints),
        risk: optionalNumber(form.risk),
        priority: optionalNumber(form.priority),
        multiplePeople: localTask.multiplePeople,
        // CRITICAL: If we just turned OFF multiplePeople, 
        // we must send the current form.teamMemberId immediately.
        fk_team_memberid_team_member: localTask.multiplePeople
          ? null
          : form.teamMemberId === "null"
            ? null
            : Number(form.teamMemberId),
      };

      const response = await apiFetch(`/api/tasks/${task.id_task}`, {
        method: "PATCH",
        body: JSON.stringify(taskBody),
      });

      if (!response.ok) {
        setError("Task changes could not be saved.");
        return;
      }

      // 2. Handle Multi-Assignee List Logic
      if (localTask.multiplePeople) {
        // If Multi is ON, sync the list
        if (hasMultiAssigneeChanges) {
          await saveTaskAssignees(task.id_task, localTask.assignees);
        }
      } else {
        // If Multi is OFF, but it WAS on, clear the multi-assignee list in DB
        if (task.multiplePeople) {
          await saveTaskAssignees(task.id_task, []);
        }
        
        // Also sync the single assignment endpoint if that specifically changed
        if (hasAssignmentChanges) {
           await apiFetch(`/api/tasks/${task.id_task}/assign_member`, {
            method: "PATCH",
            body: JSON.stringify({
              team_member_id: form.teamMemberId === "null" ? null : Number(form.teamMemberId),
            }),
          });
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


  async function saveTaskAssignees(taskId: number, assignees: number[]) {
    console.log("Saving assignees", localTask.assignees);


  const response = await apiFetch(`/api/tasks/task/${taskId}/assignees`, {
    method: "POST",
    body: JSON.stringify(assignees),
  });

  if (!response.ok) {
    setError("Could not save assignees.");
  }
}


  

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        className="w-full max-w-xl max-h-[90vh] rounded-xl border border-[#7a8798] bg-[#1f2630] shadow-2xl flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6 border-b border-[#7a8798] flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#39e7ac]">Task Details</p>
            <h3 className="mt-1.5 text-xl font-bold text-[#ffffff]">{initialForm.name || "Untitled task"}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-1.5 text-xs text-[#edf3fb] transition hover:bg-[#323d4b] hover:text-[#ffffff] flex-shrink-0"
          >
            Close
          </button>
        </div>

        <div className="mt-0 space-y-4 overflow-y-auto flex-1 px-6 py-4">
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
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={localTask.multiplePeople}
              onChange={(e) => updateTask({ multiplePeople: e.target.checked })}
            />
            Allow multiple assignees
          </label>
          )}
          {canAssignMember && localTask.multiplePeople && (
            
            <div className="mt-3">
              <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">
                Assignees
              </label>

              <div className="space-y-2">
                {members.map((m) => {
                  const isChecked = localTask.assignees.includes(m.id_team_member);

                  return (
                    <label
                      key={m.id_team_member}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          let updated: number[];

                          if (e.target.checked) {
                            updated = [...localTask.assignees, m.id_team_member];
                          } else {
                            updated = localTask.assignees.filter(
                              (id) => id !== m.id_team_member
                            );
                          }

                          updateTask({ assignees: updated });
                        }}
                      />

                      <span className="text-sm text-[#ffffff]">{m.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}




          {canAssignMember && !localTask.multiplePeople  && (
            
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
