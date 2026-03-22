import Navbar from "@/app/components/navbar";
import Link from "next/link";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getTeams(projectId: string) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(`${API_URL}/api/projects/${projectId}/teams`, {
    cache: "no-store",
    headers: {
      cookie: cookieHeader,
    },
  });

  if (!res.ok) throw new Error("Failed to fetch teams");
  return res.json();
}

export default async function SelectTeamPage({ params }: any) {
  const { id } = await params;
  const teams = await getTeams(id);

  return (
    <div className="min-h-screen bg-[#f5ede3] text-[#3e2a1f]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid grid-cols-[260px_1fr] gap-8">

          {/* LEFT SIDEBAR */}
          <aside className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-6 shadow-md">
            <h2 className="mb-6 text-2xl font-bold text-[#5c3b28]">Menu</h2>

            <div className="space-y-4">
              <Link
                href={`/projects/${id}`}
                className="block w-full rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3 text-left text-[#4b2e1f] font-medium transition hover:-translate-y-1 hover:shadow"
              >
                ← Back
              </Link>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <div className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-8 shadow-md">
            <h2 className="text-2xl font-bold text-[#5c3b28] mb-6">
              Select a Team
            </h2>

            {teams.length === 0 && (
              <p className="text-[#6f4e37]">No teams found for this project.</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {teams.map((team: any) => (
                <Link
                  key={team.team_id}
                  href={`/projects/${id}/team/${team.team_id}`}
                  className="block rounded-xl border border-[#c8a27a] bg-[#fdf7f2] p-6 shadow hover:-translate-y-1 hover:shadow-lg transition"
                >
                  <h3 className="text-xl font-semibold text-[#4b2e1f] mb-2">
                    {team.team_name}
                  </h3>

                  <p className="text-[#6f4e37]">
                    Team ID: {team.team_id}
                  </p>
                </Link>
              ))}
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}
