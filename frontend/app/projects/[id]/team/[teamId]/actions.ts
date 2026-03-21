"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export async function createSprint(formData: FormData) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const team_id = formData.get("team_id");
  const project_id = formData.get("project_id");

  const res = await fetch(`${API_URL}/api/sprints`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      team_id,
      start_date: formData.get("start_date"),
      end_date: formData.get("end_date"),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to create sprint");
  }
  
  revalidatePath(`/projects/${project_id}/team/${team_id}`);
}

export async function assignTaskToSprint(formData: FormData) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const task_id = formData.get("task_id");
  const sprint_id = formData.get("sprint_id");
  const team_id = formData.get("team_id");
  const project_id = formData.get("project_id");

  const res = await fetch(`${API_URL}/api/tasks/${task_id}/assign_sprint`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      sprint_id: sprint_id === "null" ? null : Number(sprint_id),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to assign task to sprint");
  }

  revalidatePath(`/projects/${project_id}/team/${team_id}`);
}
