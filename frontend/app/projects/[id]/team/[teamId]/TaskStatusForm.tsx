"use client";

import { updateTaskStatus } from "./actions";
import { useTransition, useState, useEffect } from "react";
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

  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const normalized = defaultValue.trim().toUpperCase();
    setValue(normalized);
  }, [defaultValue]);

  function handleSubmit(formData: FormData) {
    const newStatus = formData.get("workflow_status") as string;
    setValue(newStatus);
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
        className="rounded-lg border border-[#1e1e1e] bg-[#111] px-3 py-2 text-sm text-[#f0f0f0] outline-none"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        <option value="TODO">To Do</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="IN_REVIEW">In Review</option>
        <option value="DONE">Done</option>
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
