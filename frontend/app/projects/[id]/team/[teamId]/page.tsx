import Navbar from "@/app/components/navbar";
import Link from "next/link";

async function getTeam(projectId: string, teamId: string) {
  const res = await fetch(
    `http://localhost:8000/api/projects/${projectId}/teams`,
    { cache: "no-store" }
  );

  if (!res.ok) throw new Error("Failed to fetch teams");

  const teams = await res.json();
  return teams.find((t: any) => t.team_id === Number(teamId));
}

export default async function TeamPage({ params }: any) {
  const { id, teamId } = await params;
  const team = await getTeam(id, teamId);

  return (
    <div className="min-h-screen bg-[#f5ede3] text-[#3e2a1f]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid grid-cols-[260px_1fr] gap-8">

          {/* SIDEBAR */}
          <aside className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-6 shadow-md">
            <h2 className="mb-6 text-2xl font-bold text-[#5c3b28]">Menu</h2>

            <div className="space-y-4">
              <Link
                href={`/projects/${id}/selectTeam`}
                className="block w-full rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3 text-left text-[#4b2e1f] font-medium transition hover:-translate-y-1 hover:shadow"
              >
                ← Back
              </Link>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <div className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-8 shadow-md">
            <h2 className="text-2xl font-bold text-[#5c3b28] mb-4">
              Team Details
            </h2>

            <div className="space-y-4 bg-[#fdf7f2] p-6 rounded-xl border border-[#c8a27a]">
              <p className="text-lg text-[#4b2e1f]">
                <span className="font-semibold">Team Name:</span> {team.team_name}
              </p>

              <p className="text-lg text-[#4b2e1f]">
                <span className="font-semibold">Team ID:</span> {team.team_id}
              </p>
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}
