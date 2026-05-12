import { apiFetch } from "@/app/lib/api";
import { requireAuth } from "@/app/lib/auth";

type BurndownPoint = {
  label: string;
  date: string;
  ideal_remaining_points: number;
  actual_remaining_points: number;
  scope_points: number;
  completed_points: number;
};

type SprintStats = {
  id_sprint: number;
  team_id: number;
  start_date: string;
  end_date: string;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
  committed_tasks: number;
  committed_story_points: number;
  completed_tasks: number;
  completed_story_points: number;
  remaining_tasks: number;
  remaining_story_points: number;
  rolled_over_tasks: number;
  rolled_over_story_points: number;
  sprint_length_days: number;
  elapsed_days: number;
  remaining_days: number;
  planned_points_per_day: number;
  completion_rate: number;
  burndown_points: BurndownPoint[];
  name: string | null;
};

function formatDate(d: string) { return new Date(d).toISOString().split("T")[0]; }
function formatPoints(v: number) { return Number.isInteger(v) ? v.toString() : v.toFixed(1); }

async function getSprintStats(teamId: string, sprintId: string) {
  const res = await apiFetch(`/api/sprints/${sprintId}/stats?team_id=${teamId}`, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch sprint statistics");
  return res.json() as Promise<SprintStats>;
}

const CHART = { width: 820, height: 280, paddingX: 60, paddingY: 28 };

function getChartScale(pts: BurndownPoint[]) {
  return Math.max(...pts.map((p) => Math.max(p.ideal_remaining_points, p.actual_remaining_points, p.scope_points)), 0);
}
function toY(value: number, maxPoints: number) {
  const h = CHART.height - CHART.paddingY * 2;
  return CHART.height - CHART.paddingY - h * (maxPoints === 0 ? 0 : value / maxPoints);
}
function toX(index: number, total: number) {
  const w = CHART.width - CHART.paddingX * 2;
  return total === 1 ? CHART.width / 2 : CHART.paddingX + (w * index) / (total - 1);
}
function buildPath(pts: BurndownPoint[], maxPoints: number, getValue: (p: BurndownPoint) => number) {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i, pts.length)} ${toY(getValue(p), maxPoints)}`).join(" ");
}

export default async function SprintStatsPage({ params }: { params: Promise<{ id: string; teamId: string; sprintId: string }> }) {
  await requireAuth();
  const { id, teamId, sprintId } = await params;
  const stats = await getSprintStats(teamId, sprintId);
  const pts = stats.burndown_points;
  const maxPoints = getChartScale(pts);
  const idealPath = buildPath(pts, maxPoints, (p) => p.ideal_remaining_points);
  const actualPath = buildPath(pts, maxPoints, (p) => p.actual_remaining_points);
  const actualDots = pts.map((p, i) => ({ ...p, x: toX(i, pts.length), y: toY(p.actual_remaining_points, maxPoints) }));
  const midPoints = maxPoints > 0 ? [Math.round(maxPoints * 0.75), Math.round(maxPoints * 0.5), Math.round(maxPoints * 0.25)] : [];
  const progressPercent = stats.sprint_length_days === 0 ? 0 : Math.round((stats.elapsed_days / stats.sprint_length_days) * 100);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#39e7ac]">Sprint Stats</p>
            <h1 className="mt-1 text-2xl font-bold text-[#ffffff]">{stats.name ?? `Sprint ${stats.id_sprint}`}</h1>
            <p className="mt-1 text-sm text-[#c3ceda]">
              {formatDate(stats.start_date)} → {formatDate(stats.end_date)} · <span className="capitalize">{stats.status.toLowerCase()}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-[#39e7ac]">{stats.completion_rate}%</p>
            <p className="text-xs text-[#c3ceda]">{stats.elapsed_days}/{stats.sprint_length_days} days</p>
          </div>
        </div>
        {stats.status === "COMPLETED" && (
          <div className="mt-4 flex justify-end">
            <a
              href={`/api/proxy/sprints/${sprintId}/export?team_id=${teamId}`}
              className="rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] px-4 py-2 text-sm font-semibold text-[#39e7ac] transition hover:bg-[rgba(57,231,172,0.20)]"
            >
              Download Excel
            </a>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Committed", value: stats.committed_tasks, sub: `${formatPoints(stats.committed_story_points)} pts` },
          { label: "Done", value: stats.completed_tasks, sub: `${formatPoints(stats.completed_story_points)} pts` },
          { label: "Remaining", value: stats.remaining_tasks, sub: `${formatPoints(stats.remaining_story_points)} pts` },
          ...(stats.status === "COMPLETED" ? [{ label: "Rolled Over", value: stats.rolled_over_tasks, sub: `${formatPoints(stats.rolled_over_story_points)} pts` }] : []),
          { label: "Timeline", value: `${progressPercent}%`, sub: `${stats.remaining_days}d left` },
          { label: "Burn/day", value: formatPoints(stats.planned_points_per_day), sub: "pts ideal" },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-[#7a8798] bg-[#1f2630] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-[#ffffff]">{card.value}</p>
            <p className="mt-0.5 text-xs text-[#c3ceda]">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Burndown chart */}
      <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#edf3fb]">Burndown</h2>
          <div className="flex gap-4 text-xs text-[#c3ceda]">
            <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 bg-[#39e7ac]" />Actual</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-[#c3ceda]" />Ideal</span>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-[#667386] bg-[#28313d] p-4">
          <svg viewBox="0 0 820 280" className="min-w-[820px]">
            {[0, 1, 2, 3, 4].map((line) => (
              <line key={line} x1="48" y1={28 + line * 56} x2="772" y2={28 + line * 56} stroke="#667386" strokeDasharray="6 8" strokeWidth="1" />
            ))}
            <line x1="60" y1="252" x2="772" y2="252" stroke="#7b8798" strokeWidth="2" />
            <line x1="60" y1="28" x2="60" y2="252" stroke="#7b8798" strokeWidth="2" />
            <path d={idealPath} fill="none" stroke="#93a0b1" strokeWidth="2" strokeDasharray="10 8" strokeLinecap="round" />
            <path d={actualPath} fill="none" stroke="#39e7ac" strokeWidth="2.5" strokeLinecap="round" />
            {midPoints.map((val, i) => (
              <text key={i} x="56" y={toY(val, maxPoints) + 4} textAnchor="end" className="fill-[#c3ceda] text-[11px]">{val}</text>
            ))}
            {actualDots.map((point) => (
              <g key={point.label}>
                <circle cx={point.x} cy={point.y} r="4" fill="#28313d" stroke="#39e7ac" strokeWidth="2">
                  <title>{`${point.label} (${formatDate(point.date)}): ${formatPoints(point.actual_remaining_points)} actual, ${formatPoints(point.ideal_remaining_points)} ideal`}</title>
                </circle>
                <text x={point.x} y="270" textAnchor="middle" className="fill-[#c3ceda] text-[11px]">{point.label}</text>
              </g>
            ))}
            <text x="56" y="36" textAnchor="end" className="fill-[#c3ceda] text-[12px]">{formatPoints(maxPoints)}</text>
            <text x="56" y="256" textAnchor="end" className="fill-[#c3ceda] text-[12px]">0</text>
          </svg>
        </div>
      </div>
    </div>
  );
}
