"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

function toOptionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

export async function createTask(formData: FormData) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const payload = {
    name: formData.get("name"),
    description: formData.get("description"),
    story_points: toOptionalNumber(formData.get("story_points")),
    risk: toOptionalNumber(formData.get("risk")),
    priority: toOptionalNumber(formData.get("priority")),
    fk_projectid_project: Number(formData.get("fk_projectid_project")),
  };

  const res = await fetch(`${API_URL}/api/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
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

  let teamId = formData.get("team_id");
  if (teamId === "null") {
    teamId = "";
  }

  const res = await fetch(`${API_URL}/api/tasks/${taskId}/assign_team?team_id=${teamId}`, {
    method: "PATCH",
    headers: {
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to assign task to team");
  }

  revalidatePath(`/projects/${projectId}/backlog`);
}

export async function editTask(formData: FormData) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const taskId = Number(formData.get("task_id"));
  const projectId = Number(formData.get("project_id"));

  const payload = {
    name: formData.get("name"),
    description: formData.get("description"),
    story_points: toOptionalNumber(formData.get("story_points")),
    risk: toOptionalNumber(formData.get("risk")),
    priority: toOptionalNumber(formData.get("priority")),
  };

  const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to edit task");
  }

  revalidatePath(`/projects/${projectId}/backlog`);
}

export async function deleteTask(formData: FormData) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const taskId = formData.get("task_id");
  const projectId = formData.get("project_id");

  const res = await fetch(
    `${API_URL}/api/tasks/${taskId}`,
    {
      method: "DELETE",
      cache: "no-store",
      headers: {
        Cookie: cookieHeader,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to delete task");
  }

  revalidatePath(`/projects/${projectId}/backlog`);
}
