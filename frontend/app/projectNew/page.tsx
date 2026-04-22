import Navbar from "../components/navbar";
import NewProjectForm from "./project-form";

export default function CreateProjectPage() {
  return (
    <div className="min-h-screen bg-[#171c24] text-[#ffffff]">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-8">
          <h1 className="text-2xl font-bold text-[#ffffff]">Create Project</h1>
          <p className="mt-2 text-sm text-[#c3ceda]">
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

