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

  return (
    <select
      defaultValue={defaultValue.trim().toUpperCase()}
      disabled={isPending}
      className="rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-2 text-sm text-[#ffffff] outline-none disabled:opacity-50"
      onChange={(e) => {
        const fd = new FormData();
        fd.append("task_id", String(taskId));
        fd.append("team_id", teamId);
        fd.append("project_id", projectId);
        fd.append("workflow_status", e.target.value);
        startTransition(async () => {
          await updateTaskStatus(fd);
          router.refresh();
        });
      }}
    >
      <option value="TODO">To Do</option>
      <option value="IN_PROGRESS">In Progress</option>
      <option value="IN_REVIEW">In Review</option>
      <option value="DONE">Done</option>
    </select>
  );
}