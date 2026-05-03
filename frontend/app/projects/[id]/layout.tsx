import { apiFetch } from "@/app/lib/api";
import { requireAuth } from "@/app/lib/auth";
import ProjectSidebar from "@/app/components/ProjectSidebar";

type Team = { id_team: number; name: string | null };
type Project = { id: number; name: string | null; is_owner: boolean };
type ProjectListItem = { id: number; name: string | null };

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;

  // Fetch user, project, project list, and all teams
  const [user, project, projectsList, allTeams] = await Promise.all([
    apiFetch(`/api/user/me`, { cache: "no-store" }).then((r) => r.json()),
    apiFetch(`/api/projects/${id}`, { cache: "no-store" }).then((r) => r.json() as Promise<Project>),
    apiFetch(`/api/projects`, { cache: "no-store" }).then((r) => r.json() as Promise<ProjectListItem[]>),
    apiFetch(`/api/projects/${id}/teams`, { cache: "no-store" }).then((r) => r.json() as Promise<Team[]>),
  ]);

  // Fetch members for each team
// Fetch members for each team
const teamsWithMembers = await Promise.all(
  allTeams.map(async (team) => {
    const res = await apiFetch(
      `/api/projects/${id}/teams/${team.id_team}`,
      { cache: "no-store" }
    ).then((r) => r.json());

    const members = Array.isArray(res.team_members) ? res.team_members : [];

    return { ...team, members };
  })
);

const userTeams = project.is_owner
  ? teamsWithMembers
  : teamsWithMembers.filter((team) =>
      team.members.some((m: any) =>
        Number(m.user?.id_user ?? m.fk_userid_user) === Number(user.id_user)
      )
    );




  return (
    <div className="flex h-screen overflow-hidden bg-[#171c24] text-[#ffffff]">
      <ProjectSidebar
        projectId={id}
        projectName={project.name}
        isOwner={project.is_owner}
        projects={projectsList}
        teams={userTeams}
      />
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
