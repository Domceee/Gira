import Link from "next/link";
import { apiFetch } from "@/app/lib/api";
import { requireAuth } from "@/app/lib/auth";

type Project = {
  id: number;
  name: string | null;
  description: string | null;
  is_owner: boolean;
};

type ProjectStats = {
  total_tasks: number;
  active_tasks: number;
  unassigned_tasks: number;
  team_backlog_tasks: number;
  in_sprint_tasks: number;
  done_tasks: number;
  total_story_points: number;
  active_story_points: number;
  unassigned_story_points: number;
  team_backlog_story_points: number;
  in_sprint_story_points: number;
  done_story_points: number;
  story_points_by_team: StoryPointsByTeam[];
  teams: ProjectStatsTeamOption[];
  selected_team_id: number | null;
  velocity_report: TeamVelocitySprint[];
};

type StatCard = { label: string; value: number; share: number; storyPoints: number };
type StoryPointsByTeam = { label: string; team_id: number | null; story_points: number };
type ProjectStatsTeamOption = { team_id: number; label: string };
type TeamVelocitySprint = {
  sprint_id: number;
  start_date: string;
  end_date: string;
  committed_story_points: number;
  completed_story_points: number;
};

function formatPoints(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatDate(value: string) {
  return value.split("T")[0];
}

function getPercent(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

function getPieChartSegments(items: StoryPointsByTeam[], total: number) {
  let currentAngle = -90;
  const COLORS = ["#39e7ac", "#00d4ff", "#ff6b35", "#a855f7", "#f59e0b", "#ec4899"];
  return items.map((item, index) => {
    const angle = total === 0 ? 0 : (item.story_points / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    return { ...item, color: COLORS[index % COLORS.length], angle, startAngle, endAngle, share: getPercent(item.story_points, total) };
  });
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return [`M ${cx} ${cy}`, `L ${end.x} ${end.y}`, `A ${r} ${r} 0 ${largeArcFlag} 1 ${start.x} ${start.y}`, "Z"].join(" ");
}

function isFullCircle(angle: number) {
  return angle >= 359.999;
}

function getVelocityChartTicks(maxValue: number) {
  const tickCount = 4;
  return Array.from({ length: tickCount + 1 }, (_, index) => {
    const value = (maxValue / tickCount) * index;
    return {
      value,
      label: formatPoints(value),
      position: 160 - (index / tickCount) * 160,
    };
  });
}

async function getProject(id: string) {
  const res = await apiFetch(`/api/projects/${id}`, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch project");
  return res.json() as Promise<Project>;
}

async function getProjectStatsForTeam(id: string, teamId?: string) {
  const query = teamId ? `?team_id=${encodeURIComponent(teamId)}` : "";
  const res = await apiFetch(`/api/projects/${id}/stats${query}`, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch project stats");
  return res.json() as Promise<ProjectStats>;
}

export default async function ProjectView({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ team_id?: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const project = await getProject(id);
  let stats: ProjectStats | null = null;

  try { stats = await getProjectStatsForTeam(id, resolvedSearchParams.team_id); } catch { stats = null; }

  const statCards: StatCard[] = stats ? [
    { label: "Unassigned", value: stats.unassigned_tasks, share: getPercent(stats.unassigned_tasks, stats.active_tasks), storyPoints: stats.unassigned_story_points },
    { label: "Backlog", value: stats.team_backlog_tasks, share: getPercent(stats.team_backlog_tasks, stats.active_tasks), storyPoints: stats.team_backlog_story_points },
    { label: "In Sprint", value: stats.in_sprint_tasks, share: getPercent(stats.in_sprint_tasks, stats.active_tasks), storyPoints: stats.in_sprint_story_points },
  ] : [];

  const teamSegments = stats ? getPieChartSegments(stats.story_points_by_team, stats.active_story_points) : [];
  const selectedTeam = stats?.teams.find((team) => team.team_id === stats.selected_team_id) ?? null;
  const velocityMax = stats
    ? Math.max(1, ...stats.velocity_report.map((item) => Math.max(item.committed_story_points, item.completed_story_points)))
    : 1;
  const velocityTicks = getVelocityChartTicks(velocityMax);
  const chartHeight = 160;
  const chartBaseY = 180;
  const chartPaddingX = 64;
  const velocityGroupCount = stats?.velocity_report.length ?? 0;
  const chartWidth = Math.max(1000, chartPaddingX + 48 + velocityGroupCount * 108);
  const plotEndX = chartWidth - 24;
  const plotWidth = plotEndX - chartPaddingX;
  const velocitySlotWidth = velocityGroupCount > 0 ? plotWidth / velocityGroupCount : plotWidth;
  const velocityGroupWidth = velocityGroupCount > 0
    ? Math.min(72, Math.max(32, velocitySlotWidth * 0.5))
    : 72;
  const velocityBarGap = Math.min(8, Math.max(4, velocityGroupWidth * 0.1));
  const velocityBarWidth = Math.max(12, (velocityGroupWidth - velocityBarGap) / 2);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#39e7ac]">Overview</p>
          <h1 className="mt-1 text-2xl font-bold text-[#ffffff]">{project.name}</h1>
          {project.description && <p className="mt-1 text-sm text-[#c3ceda]">{project.description}</p>}
        </div>
        {project.is_owner && (
          <div className="flex gap-2 shrink-0">
            <Link href={`/projects/${id}/manageProject`} className="rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-2 text-sm font-medium text-[#f7faff] transition hover:bg-[#323d4b] hover:text-[#ffffff]">
              Settings
            </Link>
            <Link href={`/projects/${id}/manageTeam`} className="rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-2 text-sm font-medium text-[#f7faff] transition hover:bg-[#323d4b] hover:text-[#ffffff]">
              Manage Teams
            </Link>
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#edf3fb]">Statistics</h2>
            <span className="text-xs text-[#c3ceda]">{stats.total_tasks} tasks · {formatPoints(stats.total_story_points)} pts</span>
          </div>

          {/* Progress bar */}
          <div className="mb-5 flex h-1.5 overflow-hidden rounded-full bg-[#667386]">
            {[
              { color: "#39e7ac", share: statCards[0]?.share ?? 0 },
              { color: "#00d4ff", share: statCards[1]?.share ?? 0 },
              { color: "#ff6b35", share: statCards[2]?.share ?? 0 },
            ].map((seg, i) => (
              <div key={i} style={{ width: `${seg.share}%`, backgroundColor: seg.color }} />
            ))}
          </div>

          {/* Stat cards */}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border border-[#7a8798] bg-[#28313d] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Active</p>
              <p className="mt-2 text-2xl font-bold text-[#ffffff]">{stats.active_tasks}</p>
              <p className="mt-0.5 text-xs text-[#c3ceda]">{formatPoints(stats.active_story_points)} pts</p>
            </div>
            <div className="rounded-lg border border-[#7a8798] bg-[#28313d] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Done</p>
              <p className="mt-2 text-2xl font-bold text-[#39e7ac]">{stats.done_tasks}</p>
              <p className="mt-0.5 text-xs text-[#c3ceda]">{formatPoints(stats.done_story_points)} pts</p>
            </div>
            <div className="rounded-lg border border-[#7a8798] bg-[#28313d] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Done %</p>
              <p className="mt-2 text-2xl font-bold text-[#ffffff]">{getPercent(stats.done_tasks, stats.total_tasks)}%</p>
              <p className="mt-0.5 text-xs text-[#c3ceda]">of all tasks</p>
            </div>
            {statCards.map((card) => (
              <div key={card.label} className="rounded-lg border border-[#7a8798] bg-[#28313d] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-[#ffffff]">{card.value}</p>
                <p className="mt-0.5 text-xs text-[#c3ceda]">{formatPoints(card.storyPoints)} pts · {card.share}%</p>
              </div>
            ))}
          </div>

          {/* Pie chart */}
          {stats.active_story_points > 0 && (
            <div className="mt-6 rounded-xl border border-[#667386] bg-[#28313d] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#edf3fb] uppercase tracking-widest">Story Points by Team</h3>
                <span className="text-xs text-[#c3ceda]">active work only</span>
              </div>
              <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:items-center">
                <div className="mx-auto">
                  <svg viewBox="0 0 240 240" className="h-[200px] w-[200px]">
                    {teamSegments.map((seg) =>
                      seg.angle > 0 ? (
                        isFullCircle(seg.angle) ? (
                          <circle key={seg.label} cx="120" cy="120" r="100" fill={seg.color}>
                            <title>{`${seg.label}: ${formatPoints(seg.story_points)} pts (${seg.share}%)`}</title>
                          </circle>
                        ) : (
                          <path key={seg.label} d={describeArc(120, 120, 100, seg.startAngle, seg.endAngle)} fill={seg.color}>
                            <title>{`${seg.label}: ${formatPoints(seg.story_points)} pts (${seg.share}%)`}</title>
                          </path>
                        )
                      ) : null
                    )}
                    <circle cx="120" cy="120" r="54" fill="#28313d" />
                    <text x="120" y="115" textAnchor="middle" className="fill-[#c3ceda] text-[11px]">Total</text>
                    <text x="120" y="137" textAnchor="middle" className="fill-[#ffffff] text-[20px] font-bold">
                      {formatPoints(stats.active_story_points)}
                    </text>
                  </svg>
                </div>
                <div className="grid gap-2">
                  {teamSegments.map((seg) => (
                    <div key={seg.label} className="flex items-center justify-between rounded-lg border border-[#667386] bg-[#1f2630] px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                        <span className="text-sm text-[#f7faff]">{seg.label}</span>
                      </div>
                      <div className="text-right text-xs text-[#c3ceda]">
                        <div>{formatPoints(seg.story_points)} pts</div>
                        <div>{seg.share}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-[#667386] bg-[#28313d] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#edf3fb]">Velocity Report</h3>
                <p className="mt-1 text-xs text-[#c3ceda]">Committed vs completed story points for one team across completed sprints.</p>
              </div>
              {stats.teams.length > 0 && (
                <form method="GET" className="flex flex-wrap items-end gap-2">
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">
                    Team
                    <select
                      name="team_id"
                      defaultValue={stats.selected_team_id ?? undefined}
                      className="min-w-[220px] rounded-lg border border-[#7a8798] bg-[#1f2630] px-3 py-2 text-sm font-normal text-[#ffffff] outline-none"
                    >
                      {stats.teams.map((team) => (
                        <option key={team.team_id} value={team.team_id}>{team.label}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    className="rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] px-4 py-2 text-sm font-medium text-[#39e7ac] transition hover:bg-[rgba(57,231,172,0.20)]"
                  >
                    Apply
                  </button>
                </form>
              )}
            </div>

            {stats.teams.length === 0 ? (
              <div className="mt-5 rounded-lg border border-[#667386] bg-[#1f2630] px-4 py-4 text-sm text-[#c3ceda]">
                No teams yet. Create a team to start tracking sprint velocity.
              </div>
            ) : stats.velocity_report.length === 0 ? (
              <div className="mt-5 rounded-lg border border-[#667386] bg-[#1f2630] px-4 py-4 text-sm text-[#c3ceda]">
                {selectedTeam ? `No completed sprints for ${selectedTeam.label} yet.` : "No completed sprints yet."}
              </div>
            ) : (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-[#7a8798] bg-[#1f2630] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Selected Team</p>
                    <p className="mt-2 text-xl font-bold text-[#ffffff]">{selectedTeam?.label ?? "Unknown"}</p>
                  </div>
                  <div className="rounded-lg border border-[#7a8798] bg-[#1f2630] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Avg Committed</p>
                    <p className="mt-2 text-xl font-bold text-[#ffffff]">
                      {formatPoints(stats.velocity_report.reduce((sum, item) => sum + item.committed_story_points, 0) / stats.velocity_report.length)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#7a8798] bg-[#1f2630] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Avg Completed</p>
                    <p className="mt-2 text-xl font-bold text-[#39e7ac]">
                      {formatPoints(stats.velocity_report.reduce((sum, item) => sum + item.completed_story_points, 0) / stats.velocity_report.length)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-[#667386] bg-[#1f2630] p-4">
                  <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-[#c3ceda]">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm bg-[#00d4ff]" />
                      <span>Committed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm bg-[#39e7ac]" />
                      <span>Completed</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="flex min-w-fit justify-center">
                      <svg
                        viewBox={`0 0 ${chartWidth} 240`}
                        className="min-w-[360px]"
                        style={{ width: `${chartWidth}px`, height: "240px" }}
                        role="img"
                        aria-label="Velocity bar chart"
                      >
                        {velocityTicks.map((tick) => (
                          <g key={tick.label}>
                            <line
                              x1={chartPaddingX}
                              y1={tick.position + 20}
                              x2={chartWidth - 16}
                              y2={tick.position + 20}
                              stroke="#3a4655"
                              strokeWidth="1"
                            />
                            <text
                              x={chartPaddingX - 10}
                              y={tick.position + 24}
                              textAnchor="end"
                              fill="#93a0b1"
                              fontSize="11"
                            >
                              {tick.label}
                            </text>
                          </g>
                        ))}

                        <line
                          x1={chartPaddingX}
                          y1={chartBaseY + 1}
                          x2={chartWidth - 16}
                          y2={chartBaseY + 1}
                          stroke="#667386"
                          strokeWidth="1.5"
                        />

                        {stats.velocity_report.map((item, index) => {
                          const slotStartX = chartPaddingX + index * velocitySlotWidth;
                          const groupX = slotStartX + (velocitySlotWidth - velocityGroupWidth) / 2;
                          const committedHeight = Math.max((item.committed_story_points / velocityMax) * chartHeight, item.committed_story_points > 0 ? 6 : 0);
                          const completedHeight = Math.max((item.completed_story_points / velocityMax) * chartHeight, item.completed_story_points > 0 ? 6 : 0);
                          const labelX = slotStartX + velocitySlotWidth / 2;
                          return (
                            <g key={item.sprint_id}>
                              <rect
                                x={groupX}
                                y={chartBaseY - committedHeight}
                                width={velocityBarWidth}
                                height={committedHeight}
                                rx="4"
                                fill="#00d4ff"
                              >
                                <title>{`Sprint ${item.sprint_id} committed: ${formatPoints(item.committed_story_points)} pts`}</title>
                              </rect>
                              <rect
                                x={groupX + velocityBarWidth + velocityBarGap}
                                y={chartBaseY - completedHeight}
                                width={velocityBarWidth}
                                height={completedHeight}
                                rx="4"
                                fill="#39e7ac"
                              >
                                <title>{`Sprint ${item.sprint_id} completed: ${formatPoints(item.completed_story_points)} pts`}</title>
                              </rect>
                              <text x={labelX} y="205" textAnchor="middle" fill="#f7faff" fontSize="12" fontWeight="600">
                                {`S${item.sprint_id}`}
                              </text>
                              <text x={labelX} y="221" textAnchor="middle" fill="#93a0b1" fontSize="10">
                                {formatDate(item.end_date)}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
