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

  // ⭐ Local state for the select value
  const [value, setValue] = useState(defaultValue ?? "null");

  // ⭐ Sync state when server sends new props after refresh()
  useEffect(() => {
    setValue(defaultValue ?? "null");
  }, [defaultValue]);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await assignTaskToMember(formData);
      router.refresh(); // triggers new props from server
    });
  }

  return (
    <form action={handleSubmit} className="flex gap-2 items-center">
      <input type="hidden" name="task_id" value={taskId} />
      <input type="hidden" name="team_id" value={teamId} />
      <input type="hidden" name="project_id" value={projectId} />

      <select
        name="team_member_id"
        className="rounded-lg border border-[#c8a27a] bg-white p-2"
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
        className="rounded-lg bg-[#b08968] px-3 py-2 text-white hover:bg-[#8c6a4f] disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
