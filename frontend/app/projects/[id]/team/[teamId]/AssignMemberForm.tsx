"use client";

import { assignTaskToMembersMulti } from "./actions";
import { useTransition, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AssignMemberForm({
  taskId,
  teamId,
  projectId,
  teamMembers,
  defaultValue,
  multiple = false,
  initialMultiAssignees = [],
}: {
  taskId: number;
  teamId: string;
  projectId: string;
  teamMembers: {
    id_team_member: number;
    user: { name: string };
  }[];
  defaultValue: number | null;
  multiple?: boolean;
  initialMultiAssignees?: number[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // 🔥 Log props on load + updates
  useEffect(() => {
    console.log("AssignMemberForm loaded:", {
      taskId,
      teamId,
      projectId,
      defaultValue,
      multiple,
      initialMultiAssignees,
      teamMembers,
    });
  }, [taskId, defaultValue, multiple, initialMultiAssignees, teamMembers]);

  // SINGLE MODE
  const [singleValue, setSingleValue] = useState(defaultValue ?? "null");

  // MULTI MODE
  const [multiMode, setMultiMode] = useState(!!multiple);
  const [multiValues, setMultiValues] = useState<number[]>(initialMultiAssignees ?? []);

  // Sync with server refresh
  useEffect(() => {
    setSingleValue(defaultValue ?? "null");
    setMultiMode(!!multiple);
    setMultiValues(initialMultiAssignees ?? []);
  }, [defaultValue, multiple, initialMultiAssignees]);

  function toggleMember(id: number) {
    setMultiValues((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSave() {
    startTransition(async () => {
      if (!multiMode) {
        // SINGLE MODE
        await assignTaskToMembersMulti({
          task_id: taskId,
          multiple: false,
          single_member_id: singleValue === "null" ? null : Number(singleValue),
        });
      } else {
        // MULTI MODE
        await assignTaskToMembersMulti({
          task_id: taskId,
          multiple: true,
          team_member_ids: multiValues,
        });
      }

      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Toggle */}
      <button
        type="button"
        className="rounded-lg bg-[#d4b08a] px-3 py-2 text-white hover:bg-[#b08968]"
        onClick={() => setMultiMode((m) => !m)}
      >
        {multiMode ? "Switch to Single Assignee" : "Enable Multiple Assignees"}
      </button>

      {/* SINGLE MODE */}
      {!multiMode && (
        <select
          className="rounded-lg border border-[#c8a27a] bg-white p-2"
          value={singleValue}
          onChange={(e) => setSingleValue(e.target.value)}
        >
          <option value="null">Unassigned</option>
          {teamMembers.map((m) => (
            <option key={m.id_team_member} value={m.id_team_member}>
              {m.user.name}
            </option>
          ))}
        </select>
      )}

      {/* MULTI MODE */}
      {multiMode && (
        <div className="flex flex-col gap-2">
          <div className="rounded-lg border border-[#c8a27a] bg-white p-2">
            {teamMembers.map((m) => (
              <label key={m.id_team_member} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={multiValues.includes(m.id_team_member)}
                  onChange={() => toggleMember(m.id_team_member)}
                />
                {m.user.name}
              </label>
            ))}
          </div>

          <div className="text-sm text-[#5c3b28]">
            {multiValues.length === 0
              ? "No members selected"
              : multiValues
                  .map((id) => {
                    const m = teamMembers.find((tm) => tm.id_team_member === id);
                    return m ? `(${m.user.name})` : null;
                  })
                  .filter(Boolean)
                  .join(", ")}
          </div>
        </div>
      )}

      {/* SAVE BUTTON */}
      <button
        type="button"
        disabled={isPending}
        onClick={handleSave}
        className="rounded-lg bg-[#b08968] px-3 py-2 text-white hover:bg-[#8c6a4f] disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
