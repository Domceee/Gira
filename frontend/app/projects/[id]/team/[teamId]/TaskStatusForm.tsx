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

  // Local state for the select value
  const [value, setValue] = useState(defaultValue);

  
  useEffect(() => {
    console.log("Raw defaultValue:", JSON.stringify(defaultValue));
    const normalized = defaultValue.trim().toUpperCase();
    console.log("Task", taskId, "defaultValue from parent:", normalized);
    setValue(normalized);
  }, [defaultValue]);

  function handleSubmit(formData: FormData) {
    const newStatus = formData.get("workflow_status") as string;

    // Optimistic update
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
        className="rounded-lg border border-[#c8a27a] bg-white p-2"
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
        className="rounded-lg bg-[#b08968] px-3 py-2 text-white hover:bg-[#8c6a4f] disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
