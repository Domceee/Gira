"use server";

import { revalidatePath } from "next/cache";

export async function createTask(formData: FormData) {
  const payload = {
    name: formData.get("name"),
    description: formData.get("description"),
    story_points: Number(formData.get("story_points")),
    risk: Number(formData.get("risk")),
    priority: Number(formData.get("priority")),
    fk_projectid_project: Number(formData.get("fk_projectid_project")),
    fk_role_enumid_role_enum: 1, // REQUIRED by your DB
  };

  await fetch("http://localhost:8000/api/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
  });

  revalidatePath(`/projects/${payload.fk_projectid_project}/backlog`);
}

export async function assignTaskToTeam(formData: FormData) {
  const taskId = formData.get("task_id");
  const projectId = formData.get("project_id");

  let teamId: any = formData.get("team_id");

  // Convert "null" string → empty string (so backend gets None)
  if (teamId === "null") {
    teamId = "";
  }

  await fetch(
    `http://localhost:8000/api/tasks/${taskId}/assign_team?team_id=${teamId}`,
    { method: "PATCH" }
  );

  revalidatePath(`/projects/${projectId}/backlog`);
}
