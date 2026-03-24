import Navbar from "@/app/components/navbar";
import Link from "next/link";
import { apiFetch } from "@/app/lib/api";

type BurndownPoint = {
  label: string;
  date: string;
  ideal_remaining_points: number;
};

type SprintStats = {
  id_sprint: number;
  team_id: number;
  start_date: string;
  end_date: string;
  total_tasks: number;
  total_story_points: number;
  sprint_length_days: number;
  elapsed_days: number;
  remaining_days: number;
  planned_points_per_day: number;
  burndown_points: BurndownPoint[];
};

function formatDate(dateString: string) {
  return new Date(dateString).toISOString().split("T")[0];
}

function formatPoints(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

async function getSprintStats(teamId: string, sprintId: string) {
  const res = await apiFetch(`/api/sprints/${sprintId}/stats?team_id=${teamId}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch sprint statistics");
  }

  return res.json() as Promise<SprintStats>;
}

function getChartCoordinates(points: BurndownPoint[]) {
  const width = 820;
  const height = 280;
  const paddingX = 48;
  const paddingY = 28;
  const maxPoints = Math.max(...points.map((point) => point.ideal_remaining_points), 0);
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  return points.map((point, index) => {
    const x = points.length === 1
      ? width / 2
      : paddingX + (usableWidth * index) / (points.length - 1);
    const ratio = maxPoints === 0 ? 0 : point.ideal_remaining_points / maxPoints;
    const y = height - paddingY - usableHeight * ratio;

    return {
      ...point,
      x,
      y,
    };
  });
}

function ChartIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 3 3 5-7" />
    </svg>
  );
}

export default async function SprintStatsPage({
  params,
}: {
  params: Promise<{ id: string; teamId: string; sprintId: string }>;
}) {
  const { id, teamId, sprintId } = await params;
  const stats = await getSprintStats(teamId, sprintId);
  const chartPoints = getChartCoordinates(stats.burndown_points);
  const chartPath = chartPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const progressPercent = stats.sprint_length_days === 0
    ? 0
    : Math.round((stats.elapsed_days / stats.sprint_length_days) * 100);

  return (
    <div className="min-h-screen bg-[#f5ede3] text-[#3e2a1f]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-6 shadow-md">
            <h2 className="mb-6 text-2xl font-bold text-[#5c3b28]">Menu</h2>

            <div className="space-y-4">
              <Link
                href={`/projects/${id}/team/${teamId}`}
                className="flex w-full items-center gap-3 rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3 text-left font-medium text-[#4b2e1f] transition hover:-translate-y-1 hover:shadow"
              >
                <ChartIcon className="h-5 w-5" />
                Back to Team
              </Link>
            </div>
          </aside>

          <div className="space-y-8">
            <div className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-8 shadow-md">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#8b5e3c]">
                    Sprint Statistics
                  </p>
                  <h1 className="mt-2 text-4xl font-bold text-[#5c3b28]">
                    Sprint {stats.id_sprint}
                  </h1>
                  <p className="mt-2 text-lg text-[#6f4e37]">
                    {formatDate(stats.start_date)} to {formatDate(stats.end_date)}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#d4b08a] bg-[#fdf7f2] px-5 py-4 text-right">
                  <p className="text-sm uppercase tracking-[0.2em] text-[#8b5e3c]">Current Progress</p>
                  <p className="mt-2 text-3xl font-bold text-[#5c3b28]">{progressPercent}%</p>
                  <p className="text-[#6f4e37]">{stats.elapsed_days} of {stats.sprint_length_days} days elapsed</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-[#d9c1a7] bg-[#fffaf5] p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b5e3c]">Tasks</p>
                <p className="mt-3 text-4xl font-bold text-[#5c3b28]">{stats.total_tasks}</p>
                <p className="mt-2 text-sm text-[#6f4e37]">Tasks currently assigned to this sprint.</p>
              </div>
              <div className="rounded-2xl border border-[#d9c1a7] bg-[#fffaf5] p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b5e3c]">Story Points</p>
                <p className="mt-3 text-4xl font-bold text-[#5c3b28]">{formatPoints(stats.total_story_points)}</p>
                <p className="mt-2 text-sm text-[#6f4e37]">Total planned effort in this sprint.</p>
              </div>
              <div className="rounded-2xl border border-[#d9c1a7] bg-[#fffaf5] p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b5e3c]">Remaining Days</p>
                <p className="mt-3 text-4xl font-bold text-[#5c3b28]">{stats.remaining_days}</p>
                <p className="mt-2 text-sm text-[#6f4e37]">Time left before the sprint end date.</p>
              </div>
              <div className="rounded-2xl border border-[#d9c1a7] bg-[#fffaf5] p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b5e3c]">Planned Burn</p>
                <p className="mt-3 text-4xl font-bold text-[#5c3b28]">{formatPoints(stats.planned_points_per_day)}</p>
                <p className="mt-2 text-sm text-[#6f4e37]">Ideal story points to burn per day.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-8 shadow-md">
              <div className="mb-6 flex flex-col gap-2">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#8b5e3c]">
                  Burndown Projection
                </p>
                <h2 className="text-3xl font-bold text-[#5c3b28]">Ideal Burndown Chart</h2>
                <p className="max-w-3xl text-[#6f4e37]">
                  This chart shows the ideal path from the sprint&apos;s total planned story points down to zero by the last day.
                  Hover each point to inspect the target remaining points for that day.
                </p>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[#d4b08a] bg-[#fdf7f2] p-4">
                <svg viewBox="0 0 820 280" className="min-w-[820px]">
                  {[0, 1, 2, 3, 4].map((line) => {
                    const y = 28 + line * 56;
                    return (
                      <line
                        key={line}
                        x1="48"
                        y1={y}
                        x2="772"
                        y2={y}
                        stroke="#d8c2a8"
                        strokeDasharray="6 8"
                        strokeWidth="1"
                      />
                    );
                  })}

                  <line x1="48" y1="252" x2="772" y2="252" stroke="#9f7a56" strokeWidth="2" />
                  <line x1="48" y1="28" x2="48" y2="252" stroke="#9f7a56" strokeWidth="2" />

                  <path d={chartPath} fill="none" stroke="#8b5e3c" strokeWidth="3" strokeLinecap="round" />

                  {chartPoints.map((point) => (
                    <g key={point.label}>
                      <circle cx={point.x} cy={point.y} r="5" fill="#fffaf5" stroke="#8b5e3c" strokeWidth="2">
                        <title>
                          {`${point.label} (${formatDate(point.date)}): ${formatPoints(point.ideal_remaining_points)} ideal remaining story points`}
                        </title>
                      </circle>
                      <text x={point.x} y="270" textAnchor="middle" className="fill-[#7d624a] text-[11px]">
                        {point.label}
                      </text>
                    </g>
                  ))}

                  <text x="18" y="36" className="fill-[#7d624a] text-[12px]">
                    {formatPoints(stats.total_story_points)}
                  </text>
                  <text x="30" y="256" className="fill-[#7d624a] text-[12px]">0</text>
                </svg>
              </div>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}
