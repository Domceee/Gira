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
};

type StatCard = { label: string; value: number; share: number; storyPoints: number };
type StoryPointsByTeam = { label: string; team_id: number | null; story_points: number };

function formatPoints(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function getPercent(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

function getPieChartSegments(items: StoryPointsByTeam[], total: number) {
  let currentAngle = -90;
  const COLORS = ["#39ff14", "#00d4ff", "#ff6b35", "#a855f7", "#f59e0b", "#ec4899"];
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

async function getProject(id: string) {
  const res = await apiFetch(`/api/projects/${id}`, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch project");
  return res.json() as Promise<Project>;
}

async function getProjectStats(id: string) {
  const res = await apiFetch(`/api/projects/${id}/stats`, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch project stats");
  return res.json() as Promise<ProjectStats>;
}

export default async function ProjectView({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const project = await getProject(id);
  let stats: ProjectStats | null = null;

  try { stats = await getProjectStats(id); } catch { stats = null; }

  const statCards: StatCard[] = stats ? [
    { label: "Unassigned", value: stats.unassigned_tasks, share: getPercent(stats.unassigned_tasks, stats.active_tasks), storyPoints: stats.unassigned_story_points },
    { label: "Backlog", value: stats.team_backlog_tasks, share: getPercent(stats.team_backlog_tasks, stats.active_tasks), storyPoints: stats.team_backlog_story_points },
    { label: "In Sprint", value: stats.in_sprint_tasks, share: getPercent(stats.in_sprint_tasks, stats.active_tasks), storyPoints: stats.in_sprint_story_points },
  ] : [];

  const teamSegments = stats ? getPieChartSegments(stats.story_points_by_team, stats.active_story_points) : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#39ff14]">Overview</p>
          <h1 className="mt-1 text-2xl font-bold text-[#f0f0f0]">{project.name}</h1>
          {project.description && <p className="mt-1 text-sm text-[#555]">{project.description}</p>}
        </div>
        {project.is_owner && (
          <div className="flex gap-2 shrink-0">
            <Link href={`/projects/${id}/manageProject`} className="rounded-lg border border-[#1e1e1e] bg-[#111] px-4 py-2 text-sm font-medium text-[#ccc] transition hover:bg-[#161616] hover:text-[#f0f0f0]">
              Settings
            </Link>
            <Link href={`/projects/${id}/manageTeam`} className="rounded-lg border border-[#1e1e1e] bg-[#111] px-4 py-2 text-sm font-medium text-[#ccc] transition hover:bg-[#161616] hover:text-[#f0f0f0]">
              Manage Teams
            </Link>
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#888]">Statistics</h2>
            <span className="text-xs text-[#444]">{stats.total_tasks} tasks · {formatPoints(stats.total_story_points)} pts</span>
          </div>

          {/* Progress bar */}
          <div className="mb-5 flex h-1.5 overflow-hidden rounded-full bg-[#1a1a1a]">
            {[
              { color: "#39ff14", share: statCards[0]?.share ?? 0 },
              { color: "#00d4ff", share: statCards[1]?.share ?? 0 },
              { color: "#ff6b35", share: statCards[2]?.share ?? 0 },
            ].map((seg, i) => (
              <div key={i} style={{ width: `${seg.share}%`, backgroundColor: seg.color }} />
            ))}
          </div>

          {/* Stat cards */}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border border-[#1e1e1e] bg-[#111] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#444]">Active</p>
              <p className="mt-2 text-2xl font-bold text-[#f0f0f0]">{stats.active_tasks}</p>
              <p className="mt-0.5 text-xs text-[#444]">{formatPoints(stats.active_story_points)} pts</p>
            </div>
            <div className="rounded-lg border border-[#1e1e1e] bg-[#111] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#444]">Done</p>
              <p className="mt-2 text-2xl font-bold text-[#39ff14]">{stats.done_tasks}</p>
              <p className="mt-0.5 text-xs text-[#444]">{formatPoints(stats.done_story_points)} pts</p>
            </div>
            <div className="rounded-lg border border-[#1e1e1e] bg-[#111] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#444]">Done %</p>
              <p className="mt-2 text-2xl font-bold text-[#f0f0f0]">{getPercent(stats.done_tasks, stats.total_tasks)}%</p>
              <p className="mt-0.5 text-xs text-[#444]">of all tasks</p>
            </div>
            {statCards.map((card) => (
              <div key={card.label} className="rounded-lg border border-[#1e1e1e] bg-[#111] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#444]">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-[#f0f0f0]">{card.value}</p>
                <p className="mt-0.5 text-xs text-[#444]">{formatPoints(card.storyPoints)} pts · {card.share}%</p>
              </div>
            ))}
          </div>

          {/* Pie chart */}
          {stats.active_story_points > 0 && (
            <div className="mt-6 rounded-xl border border-[#1a1a1a] bg-[#111] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#888] uppercase tracking-widest">Story Points by Team</h3>
                <span className="text-xs text-[#444]">active work only</span>
              </div>
              <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:items-center">
                <div className="mx-auto">
                  <svg viewBox="0 0 240 240" className="h-[200px] w-[200px]">
                    {teamSegments.map((seg) =>
                      seg.angle > 0 ? (
                        <path key={seg.label} d={describeArc(120, 120, 100, seg.startAngle, seg.endAngle)} fill={seg.color}>
                          <title>{`${seg.label}: ${formatPoints(seg.story_points)} pts (${seg.share}%)`}</title>
                        </path>
                      ) : null
                    )}
                    <circle cx="120" cy="120" r="54" fill="#111" />
                    <text x="120" y="115" textAnchor="middle" className="fill-[#555] text-[11px]">Total</text>
                    <text x="120" y="137" textAnchor="middle" className="fill-[#f0f0f0] text-[20px] font-bold">
                      {formatPoints(stats.active_story_points)}
                    </text>
                  </svg>
                </div>
                <div className="grid gap-2">
                  {teamSegments.map((seg) => (
                    <div key={seg.label} className="flex items-center justify-between rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                        <span className="text-sm text-[#ccc]">{seg.label}</span>
                      </div>
                      <div className="text-right text-xs text-[#555]">
                        <div>{formatPoints(seg.story_points)} pts</div>
                        <div>{seg.share}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
