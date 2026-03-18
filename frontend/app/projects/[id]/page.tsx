import Navbar from "@/app/components/navbar";
import Link from "next/link";


async function getProject(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch project");
  }

  return res.json();
}

export default async function ProjectView({ params }: any) {
  const { id } = await params;
  const project = await getProject(id);

  return (
    <div className="min-h-screen bg-[#f5ede3] text-[#3e2a1f]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid grid-cols-[260px_1fr] gap-8">

          {/* LEFT SIDEBAR */}
            <aside className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-6 shadow-md">
            <h2 className="mb-6 text-2xl font-bold text-[#5c3b28]">
                Menu
            </h2>

            <div className="space-y-4">
                <Link
                href={`/projects/${id}/backlog`}
                className="block w-full rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3 text-left text-[#4b2e1f] font-medium transition hover:-translate-y-1 hover:shadow"
                >
                Backlog
                </Link>

                
            </div>
            <div className="space-y-4">
                <Link
                href={`/projects/${id}/selectTeam`}
                className="block w-full rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3 text-left text-[#4b2e1f] font-medium transition hover:-translate-y-1 hover:shadow"
                >
                Select Team
                </Link>

                
            </div>
            </aside>


          {/* MAIN CONTENT */}
          <div className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-8 shadow-md">
            <h1 className="mb-6 text-4xl font-bold text-[#5c3b28]">
              {project.name}
            </h1>

            <p className="text-lg text-[#6f4e37]">
              {project.description ?? "No description available."}
            </p>
          </div>

        </section>
      </main>
    </div>
  );
}
