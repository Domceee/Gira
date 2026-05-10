"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* -------------------------------------------------------
   LOAD RETROSPECTIVE
------------------------------------------------------- */
export async function loadRetrospective({
  projectId,
  teamId,
  sprintId,
}: {
  projectId: string;
  teamId: string;
  sprintId: string;
}) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(
    `${API_URL}/api/retrospective/${sprintId}?team_id=${teamId}&project_id=${projectId}`,
    {
      method: "GET",
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    }
  );

  if (!res.ok) return null;

  return await res.json();
}

/* -------------------------------------------------------
   SAVE RETROSPECTIVE
------------------------------------------------------- */
export async function saveRetrospective(formData: FormData) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const sprint_id = formData.get("sprint_id");
  const team_id = formData.get("team_id");
  const project_id = formData.get("project_id");

  const retroString = formData.get("retro") as string;
  const retroJson = JSON.parse(retroString);

  const res = await fetch(
    `${API_URL}/api/retrospective/${sprint_id}?team_id=${team_id}&project_id=${project_id}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      // FIX: send raw JSON, not { retro: ... }
      body: JSON.stringify(retroJson),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to save retrospective");
  }

  revalidatePath(`/projects/${project_id}/teams-dashboard`, "page");
}


export async function toggleRetrospective({
  sprintId,
  teamId,
  projectId,
}: {
  sprintId: string;
  teamId: string;
  projectId: string;
}) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(
    `${API_URL}/api/retrospective/${sprintId}/toggle?team_id=${teamId}&project_id=${projectId}`,
    {
      method: "POST",
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to toggle retrospective");
  }

  revalidatePath(`/projects/${projectId}/teams-dashboard`, "page");

  return await res.json(); // returns { is_finished: true/false }
}


export async function loadMemberRetrospective({
  projectId,
  teamId,
  sprintId,
}: {
  projectId: string;
  teamId: string;
  sprintId: string;
}) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(
    `${API_URL}/api/retrospective/member/${sprintId}?team_id=${teamId}&project_id=${projectId}`,
    {
      method: "GET",
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    }
  );

  if (!res.ok) return null;

  return await res.json();
}


export async function saveMemberRetrospective({
  projectId,
  teamId,
  sprintId,
  retro,
}: {
  projectId: string;
  teamId: string;
  sprintId: string;
  retro: any;
}) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(
    `${API_URL}/api/retrospective/member/${sprintId}?team_id=${teamId}&project_id=${projectId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify(retro),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to save member retrospective");
  }

  return await res.json();
}

/* -------------------------------------------------------
   LOAD ALL MEMBER RETROSPECsTIVES
------------------------------------------------------- */
export async function loadAllMemberRetrospectives({
  projectId,
  teamId,
  sprintId,
}: {
  projectId: string;
  teamId: string;
  sprintId: string;
}) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(
    `${API_URL}/api/retrospective/member/${sprintId}/all?team_id=${teamId}&project_id=${projectId}`,
    {
      method: "GET",
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    }
  );

  if (!res.ok) return [];

  return await res.json();
}

export async function submitMemberRetrospective({
  projectId,
  teamId,
  sprintId,
}: {
  projectId: string;
  teamId: string;
  sprintId: string;
}) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(
    `${API_URL}/api/retrospective/member/${sprintId}/submit?team_id=${teamId}&project_id=${projectId}`,
    {
      method: "POST",
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    }
  );

  return await res.json();
}
/* -------------------------------------------------------
   CHECK TEAM MEMBERSHIP
------------------------------------------------------- */
export async function summarizeRetrospective({
  projectId,
  teamId,
  sprintId,
}: {
  projectId: string;
  teamId: string;
  sprintId: string;
}) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(`${API_URL}/api/retrospective/summarize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ projectId, teamId, sprintId }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to generate actions");
  }

  return await res.json(); // { actions: ["...", "..."] }
}

export async function checkTeamMembership({
  teamId,
}: {
  teamId: string;
}) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(
    `${API_URL}/api/retrospective/team/${teamId}/is-member`,
    {
      method: "GET",
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    console.log("Membership check failed:", res.status);
    return { is_member: false };
  }

  return await res.json(); // { is_member: true/false }
}
