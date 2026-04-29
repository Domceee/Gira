"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

  //revalidatePath(`/projects/${project_id}/team/${team_id}`, "page");
  revalidatePath(`/projects/${project_id}/teams-dashboard`, "page");


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

  //revalidatePath(`/projects/${project_id}/team/${team_id}`, "page");
  revalidatePath(`/projects/${project_id}/teams-dashboard`, "page");


}

export async function assignTaskToMember(formData: FormData) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const task_id = formData.get("task_id");
  const team_member_id = formData.get("team_member_id");
  const team_id = formData.get("team_id");
  const project_id = formData.get("project_id");

  const payload = {
    team_member_id: team_member_id === "null" ? null : Number(team_member_id),
  };

  // IMPORTANT: include team_id in the query string
  const res = await fetch(
    `${API_URL}/api/tasks/${task_id}/assign_member?team_id=${team_id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to assign task to member");
  }

  // FIX: force Next.js to drop cached page
 // revalidatePath(`/projects/${project_id}/team/${team_id}`, "page");
  revalidatePath(`/projects/${project_id}/teams-dashboard`, "page");


}

export async function closeSprint(formData: FormData) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const sprint_id = formData.get("sprint_id");
  const team_id = formData.get("team_id");
  const project_id = formData.get("project_id");

  const res = await fetch(`${API_URL}/api/sprints/${sprint_id}/close`, {
    method: "POST",
    headers: {
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to close sprint");
  }

  //revalidatePath(`/projects/${project_id}/team/${team_id}`, "page");
  //revalidatePath(`/projects/${project_id}/board`, "page");
  revalidatePath(`/projects/${project_id}/teams-dashboard`, "page");

}

export async function updateTaskStatus(formData: FormData) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const task_id = formData.get("task_id");
  const team_id = formData.get("team_id");
  const project_id = formData.get("project_id");
  const workflow_status = formData.get("workflow_status");

  const res = await fetch(`${API_URL}/api/tasks/${task_id}/board-position`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      workflow_status,
      board_order: 0, // you can improve this later
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to update task status");
  }

  //revalidatePath(`/projects/${project_id}/team/${team_id}`, "page");
 revalidatePath(`/projects/${project_id}/teams-dashboard`, "page");


}
export async function updateSprint(formData: FormData) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const sprint_id = formData.get("sprint_id");
  const team_id = formData.get("team_id");
  const project_id = formData.get("project_id");

  const name = formData.get("name");
  const start_date = formData.get("start_date");
  const end_date = formData.get("end_date");

  const res = await fetch(`${API_URL}/api/sprints/${sprint_id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      name,
      start_date,
      end_date,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to update sprint");
  }

  revalidatePath(`/projects/${project_id}/teams-dashboard`, "page");
}

export async function deleteSprintAction(formData: FormData) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const sprint_id = formData.get("sprint_id");

  const res = await fetch(`${API_URL}/api/sprints/${sprint_id}`, {
    method: "DELETE",
    headers: {
      Cookie: cookieHeader,  
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to delete sprint");
  }

  return;
}


