import { apiFetch } from "@/app/lib/api";
import { requireAuth } from "@/app/lib/auth";
import TeamViewContent from "./TeamViewContent";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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
  user: { id_user: number; name: string; email: string; picture: string | null };
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

export default async function TeamView({ params }: { params: Promise<{ id: string; teamId: string }> }) {
  await requireAuth();
  const { id, teamId } = await params;
  const team = await getTeam(id, teamId);
  const sortedSprints = [...(await getSprints(teamId))].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  const activeSprints = sortedSprints.filter((s) => s.status === "ACTIVE");
  const plannedSprints = sortedSprints.filter((s) => s.status === "PLANNED");
  const endedSprints = sortedSprints.filter((s) => s.status === "COMPLETED");

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#39e7ac]">Team</p>
        <h1 className="mt-1 text-2xl font-bold text-[#ffffff]">{team.team_name ?? `Team ${teamId}`}</h1>
      </div>
      <TeamViewContent
        team={team}
        projectId={id}
        teamId={teamId}
        activeSprints={activeSprints}
        plannedSprints={plannedSprints}
        endedSprints={endedSprints}
      />
    </div>
  );
}
