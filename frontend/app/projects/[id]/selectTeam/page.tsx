import Link from "next/link";
import Navbar from "@/app/components/navbar";
import { apiFetch } from "@/app/lib/api";
import { requireAuth } from "@/app/lib/auth";

type Team = {
  id_team: number;
  name: string | null;
};

async function getTeams(projectId: string): Promise<Team[]> {
  const res = await apiFetch(`/api/projects/${projectId}/teams`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch teams");
  return res.json();
}

export default async function SelectTeamPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const teams = await getTeams(id);

  return (
    <div className="min-h-screen bg-[#f5ede3] text-[#3e2a1f]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid grid-cols-[260px_1fr] gap-8">
          <aside className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-6 shadow-md">
            <h2 className="mb-6 text-2xl font-bold text-[#5c3b28]">Menu</h2>

            <div className="space-y-4">
              <Link
                href={`/projects/${id}`}
                className="block w-full rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3 text-left font-medium text-[#4b2e1f] transition hover:-translate-y-1 hover:shadow"
              >
                Back
              </Link>
            </div>
          </aside>

          <div className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-8 shadow-md">
            <h2 className="mb-6 text-2xl font-bold text-[#5c3b28]">Select a Team</h2>

            {teams.length === 0 && (
              <p className="text-[#6f4e37]">No teams found for this project.</p>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {teams.map((team) => (
                <Link
                  key={team.id_team}
                  href={`/projects/${id}/team/${team.id_team}`}
                  className="block rounded-xl border border-[#c8a27a] bg-[#fdf7f2] p-6 shadow transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <h3 className="mb-2 text-xl font-semibold text-[#4b2e1f]">
                    {team.name ?? "Unnamed team"}
                  </h3>

                  <p className="text-[#6f4e37]">Team ID: {team.id_team}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
