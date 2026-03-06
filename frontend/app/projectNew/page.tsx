import Navbar from "../components/navbar";
import NewProjectForm from "./project-form";

export default function CreateProjectPage() {
  return (
    <div className="min-h-screen bg-[#f5ede3] text-[#3e2a1f]">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-8 shadow-md">
          <h1 className="text-3xl font-bold text-[#5c3b28]">Create Project</h1>
          <p className="mt-2 text-sm text-[#6f4e37]">
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