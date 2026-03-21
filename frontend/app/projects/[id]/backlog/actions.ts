"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export async function createTask(formData: FormData) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const payload = {
    name: formData.get("name"),
    description: formData.get("description"),
    story_points: Number(formData.get("story_points")),
    risk: Number(formData.get("risk")),
    priority: Number(formData.get("priority")),
    fk_projectid_project: Number(formData.get("fk_projectid_project")),
    fk_role_enumid_role_enum: 1, // REQUIRED by your DB
  };

  const res = await fetch(`${API_URL}/api/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": cookieHeader
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to create task");
  }

  revalidatePath(`/projects/${payload.fk_projectid_project}/backlog`);
}

export async function assignTaskToTeam(formData: FormData) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const taskId = formData.get("task_id");
  const projectId = formData.get("project_id");

  let teamId: any = formData.get("team_id");

  // Convert "null" string → empty string (so backend gets None)
  if (teamId === "null") {
    teamId = "";
  }

  const res =await fetch(
    `${API_URL}/api/tasks/${taskId}/assign_team?team_id=${teamId}`,
    { 
      method: "PATCH",
      headers: {
        "Cookie": cookieHeader
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to assign task to team");
  }

  revalidatePath(`/projects/${projectId}/backlog`);
}
