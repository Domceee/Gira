"use client";

import { updateTaskStatus } from "./actions";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function TaskStatusForm({
  taskId,
  teamId,
  projectId,
  defaultValue,
}: {
  taskId: number;
  teamId: string;
  projectId: string;
  defaultValue: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updateTaskStatus(formData);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="flex gap-2 items-center">
      <input type="hidden" name="task_id" value={taskId} />
      <input type="hidden" name="team_id" value={teamId} />
      <input type="hidden" name="project_id" value={projectId} />

      <select
        name="workflow_status"
        className="rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-2 text-sm text-[#ffffff] outline-none"
        defaultValue={defaultValue.trim().toUpperCase()}
      >
        <option value="TODO">To Do</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="IN_REVIEW">In Review</option>
        <option value="DONE">Done</option>
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
