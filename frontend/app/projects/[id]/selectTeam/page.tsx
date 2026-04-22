import Link from "next/link";
import { apiFetch } from "@/app/lib/api";
import { requireAuth } from "@/app/lib/auth";

type Team = {
  id_team: number;
  name: string | null;
};

type Project = {
  id: number;
  name: string | null;
  description: string | null;
  is_owner: boolean;
};

type TeamMember = {
  id_user: number;
  name: string;
  email: string;
};

async function getProject(projectId: string): Promise<Project> {
  const res = await apiFetch(`/api/projects/${projectId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch project");
  return res.json();
}

async function getTeams(projectId: string): Promise<Team[]> {
  const res = await apiFetch(`/api/projects/${projectId}/teams`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch teams");
  return res.json();
}

async function getTeamMembers(projectId: string, teamId: number): Promise<TeamMember[]> {
  const res = await apiFetch(`/api/projects/${projectId}/teams/${teamId}/members`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch team members");
  return res.json();
}

async function getCurrentUser() {
  const res = await apiFetch(`/api/user/me`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch current user");
  return res.json();
}

export default async function SelectTeamPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  const project = await getProject(id);
  const teams = await getTeams(id);
  const currentUser = await getCurrentUser();

  let visibleTeams = teams;

  if (!project.is_owner) {
    const teamsWithUserMembership = await Promise.all(
      teams.map(async (team) => {
        const members = await getTeamMembers(id, team.id_team);
        const isMember = members.some((member) => member.id_user === currentUser.id_user);
        return { team, isMember };
      })
    );
    visibleTeams = teamsWithUserMembership
      .filter(({ isMember }) => isMember)
      .map(({ team }) => team);
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/projects/${id}`} className="text-xs text-[#c3ceda] hover:text-[#ffffff] transition-colors">
          ← Back
        </Link>
        <h1 className="text-xl font-bold text-[#ffffff]">Select a Team</h1>
      </div>

      {visibleTeams.length === 0 && (
        <p className="text-sm text-[#c3ceda]">No teams found for this project.</p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleTeams.map((team) => (
          <Link
            key={team.id_team}
            href={`/projects/${id}/team/${team.id_team}`}
            className="block rounded-xl border border-[#7a8798] bg-[#1f2630] p-6 transition hover:border-[rgba(57,231,172,0.25)] hover:bg-[#28313d]"
          >
            <h3 className="text-base font-semibold text-[#ffffff]">
              {team.name ?? "Unnamed team"}
            </h3>
            <p className="mt-1 text-xs text-[#c3ceda]">Team ID: {team.id_team}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
