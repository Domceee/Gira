"use client";

import { assignTaskToMember } from "./actions";
import { useTransition } from "react";
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
        className="rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-2 text-sm text-[#ffffff] outline-none"
        defaultValue={defaultValue ?? "null"}
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
        className="rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] px-3 py-2 text-sm font-bold text-[#39e7ac] transition hover:bg-[rgba(57,231,172,0.20)] disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
