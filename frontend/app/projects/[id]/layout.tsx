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

  const [project, projectsList, teams] = await Promise.all([
    apiFetch(`/api/projects/${id}`, { cache: "no-store" }).then((r) => r.json() as Promise<Project>),
    apiFetch(`/api/projects`, { cache: "no-store" }).then((r) => r.json() as Promise<ProjectListItem[]>),
    apiFetch(`/api/projects/${id}/teams`, { cache: "no-store" }).then((r) => r.json() as Promise<Team[]>),
  ]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#080808] text-[#f0f0f0]">
      <ProjectSidebar
        projectId={id}
        projectName={project.name}
        isOwner={project.is_owner}
        projects={projectsList}
        teams={teams}
      />
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
