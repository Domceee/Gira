import TeamViewContent from "../team/[teamId]/TeamViewContent";
import { apiFetch } from "@/app/lib/api";

// Reuse the same types as TeamView
type Task = {
  id_task: number;
  name: string;
  description: string | null;
  story_points: number | null;
  risk: number | null;
  priority: number | null;
  fk_sprintid_sprint: number | null;
  fk_team_memberid_team_member: number | null;
  workflow_status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
};

type TeamMember = {
  id_team_member: number;
  role_in_team: string | null;
  effectiveness: number | null;
  user: {
    id_user: number;
    name: string;
    email: string;
    picture: string | null;
  };
};

type Sprint = {
  id_sprint: number;
  start_date: string;
  end_date: string;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
  tasks: Task[];
};

type TeamBacklog = {
  team_id: number;
  team_name: string | null;
  tasks: Task[];
  team_members: TeamMember[];
};

// Fetch functions (copied from TeamView)
async function getTeam(projectId: string, teamId: string): Promise<TeamBacklog> {
  const res = await apiFetch(`/api/projects/${projectId}/teams/${teamId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch team");
  return res.json();
}

async function getSprints(teamId: string): Promise<Sprint[]> {
  const res = await apiFetch(`/api/sprints?team_id=${teamId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch sprints");
  return res.json();
}

export default async function TeamViewWrapper({
  projectId,
  teamId,
}: {
  projectId: string;
  teamId: number;
}) {
  const team = await getTeam(projectId, String(teamId));
  const sprints = await getSprints(String(teamId));

  const sorted = [...sprints].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  return (
    <TeamViewContent
      team={team}
      projectId={projectId}
      teamId={teamId}
      activeSprints={sorted.filter((s) => s.status === "ACTIVE")}
      plannedSprints={sorted.filter((s) => s.status === "PLANNED")}
      endedSprints={sorted.filter((s) => s.status === "COMPLETED")}
    />
  );
}
