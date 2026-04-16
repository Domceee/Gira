import Navbar from "@/app/components/navbar";
import { apiFetch } from "@/app/lib/api";
import { requireAuth } from "@/app/lib/auth";
import DashboardClient from "./DashboardClient";
import TeamViewWrapper from "./TeamViewWrapper";
import DashboardSidebar from "./DashboardSidebar"; 

export default async function TeamsDashboardPage({ params, searchParams }: any) {
  await requireAuth();

  const { id } = await params;
  const sp = await searchParams;

  const teams = await apiFetch(`/api/projects/${id}/teams`, { cache: "no-store" })
    .then((r) => r.json());

  const selectedTeamId = sp?.team ? Number(sp.team) : null;

  return (
    <div className="min-h-screen bg-[#f5ede3] text-[#3e2a1f]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid grid-cols-[260px_1fr] gap-8">

          {/* ⭐ Dashboard sidebar ALWAYS visible */}
          <DashboardSidebar projectId={id} />

          <div>
            {/* ⭐ Team selector always visible */}
            <DashboardClient projectId={id} teams={teams} />

            {/* ⭐ Only the CONTENT of TeamView loads here */}
            {selectedTeamId && (
              <TeamViewWrapper projectId={id} teamId={selectedTeamId} />
            )}
          </div>

        </section>
      </main>
    </div>
  );
}
