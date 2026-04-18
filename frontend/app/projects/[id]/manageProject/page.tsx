import { apiFetch } from "@/app/lib/api";
import { requireAuth } from "@/app/lib/auth";
import ManageProjectForm from "./manage-project-form";

type Project = {
  id: number;
  name: string | null;
  description: string | null;
  is_owner: boolean;
  can_delete: boolean;
  delete_block_reason: string | null;
};

async function getProject(id: string) {
  const res = await apiFetch(`/api/projects/${id}`, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch project");
  return res.json() as Promise<Project>;
}

export default async function ManageProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const project = await getProject(id);

  if (!project.is_owner) throw new Error("Forbidden");

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#39ff14]">Settings</p>
        <h1 className="mt-1 text-2xl font-bold text-[#f0f0f0]">Manage Project</h1>
      </div>
      <div className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-8">
        <ManageProjectForm project={project} />
      </div>
    </div>
  );
}
