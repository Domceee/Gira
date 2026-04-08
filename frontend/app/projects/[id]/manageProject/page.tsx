import Navbar from "@/app/components/navbar";
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

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getProject(id: string) {
  const res = await apiFetch(`/api/projects/${id}`, { method: "GET", cache: "no-store" });

  if (!res.ok) {
    throw new Error("Failed to fetch project");
  }

  return res.json() as Promise<Project>;
}

export default async function ManageProjectPage({ params }: PageProps) {
  await requireAuth();
  const { id } = await params;
  const project = await getProject(id);

  if (!project.is_owner) {
    throw new Error("Forbidden");
  }

  return (
    <div className="min-h-screen bg-[#f5ede3] text-[#3e2a1f]">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-8 shadow-md">
          <h1 className="mb-6 text-3xl font-bold text-[#5c3b28]">Manage Project</h1>
          <ManageProjectForm project={project} />
        </div>
      </main>
    </div>
  );
}
