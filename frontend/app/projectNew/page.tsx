import Navbar from "../components/navbar";
import NewProjectForm from "./project-form";

export default function CreateProjectPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-[#f0f0f0]">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-8">
          <h1 className="text-2xl font-bold text-[#f0f0f0]">Create Project</h1>
          <p className="mt-2 text-sm text-[#555]">
            Add a new project to your system.
          </p>

          <div className="mt-8">
            <NewProjectForm />
          </div>
        </div>
      </main>
    </div>
  );
}
