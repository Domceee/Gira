import { apiFetch } from "@/app/lib/api";
import { requireAuth } from "@/app/lib/auth";
import ManageProjectForm from "./manage-project-form";
import { Toaster } from "react-hot-toast";

type Project = {
  id: number;
  name: string | null;
  description: string | null;
  use_swimlane_board: boolean;
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
    <div className="mx-auto max-w-7xl p-6">
      <Toaster 
        
        />  
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#39e7ac]">Settings</p>
        <h1 className="mt-1 text-2xl font-bold text-[#ffffff]">Manage Project</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#c3ceda]">
          Update the project basics, choose the board style, and invite new members from one place.
        </p>
      </div>
      <div className="rounded-2xl border border-[#7a8798] bg-[#171c24] p-4 sm:p-5">
        
        <ManageProjectForm project={project} />
      </div>
    </div>
  );
}
