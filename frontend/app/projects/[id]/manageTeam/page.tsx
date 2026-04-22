import { redirect } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { requireAuth } from "@/app/lib/auth";
import ManageTeamsPageContent from "./manage-teams-page-content";

type Project = { id: number; name: string | null; description: string | null; is_owner: boolean };

async function getProject(id: string) {
  const res = await apiFetch(`/api/projects/${id}`, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch project");
  return res.json() as Promise<Project>;
}

export default async function ManageTeamPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const project = await getProject(id);

  if (!project.is_owner) redirect(`/projects/${id}`);

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#39e7ac]">Teams</p>
        <h1 className="mt-1 text-2xl font-bold text-[#ffffff]">Manage Teams</h1>
        <p className="mt-1 text-sm text-[#c3ceda]">Create teams, assign members, and manage roles.</p>
      </div>
      <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-8">
        <ManageTeamsPageContent projectId={id} projectName={project.name ?? "Unnamed Project"} />
      </div>
    </div>
  );
}
