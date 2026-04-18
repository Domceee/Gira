"use client";

import { assignTaskToMember } from "./actions";
import { useTransition, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AssignMemberForm({
  taskId,
  teamId,
  projectId,
  teamMembers,
  defaultValue,
}: {
  taskId: number;
  teamId: string;
  projectId: string;
  teamMembers: {
    id_team_member: number;
    user: { name: string };
  }[];
  defaultValue: number | null;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [value, setValue] = useState(defaultValue ?? "null");

  useEffect(() => {
    setValue(defaultValue ?? "null");
  }, [defaultValue]);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await assignTaskToMember(formData);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="flex gap-2 items-center">
      <input type="hidden" name="task_id" value={taskId} />
      <input type="hidden" name="team_id" value={teamId} />
      <input type="hidden" name="project_id" value={projectId} />

      <select
        name="team_member_id"
        className="rounded-lg border border-[#1e1e1e] bg-[#111] px-3 py-2 text-sm text-[#f0f0f0] outline-none"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        <option value="null">Unassigned</option>
        {teamMembers.map((m) => (
          <option key={m.id_team_member} value={m.id_team_member}>
            {m.user.name}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg border border-[rgba(57,255,20,0.3)] bg-[rgba(57,255,20,0.08)] px-3 py-2 text-sm font-bold text-[#39ff14] transition hover:bg-[rgba(57,255,20,0.14)] disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
