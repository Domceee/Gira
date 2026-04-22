import { apiFetch } from "@/app/lib/api";
import { requireAuth } from "@/app/lib/auth";
import DashboardClient from "./DashboardClient";
import TeamViewWrapper from "./TeamViewWrapper";

type Team = {
  id_team: number;
  name: string | null;
};

type TeamsDashboardPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ team?: string | string[] }>;
};

export default async function TeamsDashboardPage({ params, searchParams }: TeamsDashboardPageProps) {
  await requireAuth();
  const { id } = await params;
  const sp = await searchParams;
  const teams = await apiFetch(`/api/projects/${id}/teams`, { cache: "no-store" }).then(
    (r) => r.json() as Promise<Team[]>
  );
  const selectedTeamParam = Array.isArray(sp.team) ? sp.team[0] : sp.team;
  const selectedTeamId = selectedTeamParam ? Number(selectedTeamParam) : null;

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#39e7ac]">Teams</p>
        <h1 className="mt-1 text-2xl font-bold text-[#ffffff]">Team Dashboard</h1>
      </div>
      <DashboardClient projectId={id} teams={teams} />
      {selectedTeamId && <TeamViewWrapper projectId={id} teamId={selectedTeamId} />}
    </div>
  );
}
