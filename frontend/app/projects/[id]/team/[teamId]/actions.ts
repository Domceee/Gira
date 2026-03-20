"use server";

import { revalidatePath } from "next/cache";



export async function createSprint(formData: FormData) {
  const team_id = formData.get("team_id");
  const project_id = formData.get("project_id");

  await fetch("http://localhost:8000/api/sprints", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      team_id,
      start_date: formData.get("start_date"),
      end_date: formData.get("end_date"),
    }),
  });

  
  revalidatePath(`/projects/${project_id}/team/${team_id}`);
}

export async function assignTaskToSprint(formData: FormData) {
  const task_id = formData.get("task_id");
  const sprint_id = formData.get("sprint_id");
  const team_id = formData.get("team_id");
  const project_id = formData.get("project_id");

  await fetch(`http://localhost:8000/api/tasks/${task_id}/assign_sprint`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sprint_id: sprint_id === "null" ? null : Number(sprint_id),
    }),
  });

  revalidatePath(`/projects/${project_id}/team/${team_id}`);
}
