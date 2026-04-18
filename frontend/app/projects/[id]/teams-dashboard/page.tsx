import { apiFetch } from "@/app/lib/api";
import { requireAuth } from "@/app/lib/auth";
import DashboardClient from "./DashboardClient";
import TeamViewWrapper from "./TeamViewWrapper";

export default async function TeamsDashboardPage({ params, searchParams }: any) {
  await requireAuth();
  const { id } = await params;
  const sp = await searchParams;
  const teams = await apiFetch(`/api/projects/${id}/teams`, { cache: "no-store" }).then((r) => r.json());
  const selectedTeamId = sp?.team ? Number(sp.team) : null;

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#39ff14]">Teams</p>
        <h1 className="mt-1 text-2xl font-bold text-[#f0f0f0]">Team Dashboard</h1>
      </div>
      <DashboardClient projectId={id} teams={teams} />
      {selectedTeamId && <TeamViewWrapper projectId={id} teamId={selectedTeamId} />}
    </div>
  );
}
