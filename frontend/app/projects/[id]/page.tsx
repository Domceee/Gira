import Navbar from "@/app/components/navbar";
import Link from "next/link";
import { apiFetch } from "@/app/lib/api";

type Project = {
  id: number;
  name: string | null;
  description: string | null;
  is_owner: boolean;
};

type ProjectStats = {
  total_tasks: number;
  unassigned_tasks: number;
  team_backlog_tasks: number;
  in_sprint_tasks: number;
  total_story_points: number;
  unassigned_story_points: number;
  team_backlog_story_points: number;
  in_sprint_story_points: number;
  story_points_by_team: StoryPointsByTeam[];
};

type StatCard = {
  label: string;
  value: number;
  share: number;
  storyPoints: number;
  helper: string;
};

type StoryPointsByTeam = {
  label: string;
  team_id: number | null;
  story_points: number;
};

function formatPoints(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function getPercent(value: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function getPieChartSegments(items: StoryPointsByTeam[], total: number) {
  let currentAngle = -90;

  return items.map((item, index) => {
    const angle = total === 0 ? 0 : (item.story_points / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    return {
      ...item,
      color: ["#9f6b44", "#7b8f4a", "#7a739b", "#c28d52", "#6e8b87", "#b85d5d"][index % 6],
      angle,
      startAngle,
      endAngle,
      share: getPercent(item.story_points, total),
    };
  });
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(radians),
    y: cy + r * Math.sin(radians),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${end.x} ${end.y}`,
    `A ${r} ${r} 0 ${largeArcFlag} 1 ${start.x} ${start.y}`,
    "Z",
  ].join(" ");
}

async function getProject(id: string) {
  const res = await apiFetch(`/api/projects/${id}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch project");
  }

  return res.json() as Promise<Project>;
}

async function getProjectStats(id: string) {
  const res = await apiFetch(`/api/projects/${id}/stats`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch project stats");
  }

  return res.json() as Promise<ProjectStats>;
}

export default async function ProjectView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  let stats: ProjectStats | null = null;
  let statsError: string | null = null;

  try {
    stats = await getProjectStats(id);
  } catch {
    stats = null;
    statsError = "Project statistics could not be loaded right now.";
  }

  const statCards: StatCard[] = stats
    ? [
        {
          label: "Unassigned",
          value: stats.unassigned_tasks,
          share: getPercent(stats.unassigned_tasks, stats.total_tasks),
          storyPoints: stats.unassigned_story_points,
          helper: "Tasks still sitting in the project backlog with no team assigned yet.",
        },
    {
      label: "Backlog",
      value: stats.team_backlog_tasks,
      share: getPercent(stats.team_backlog_tasks, stats.total_tasks),
      storyPoints: stats.team_backlog_story_points,
      helper: "Tasks owned by a team, but not scheduled into any sprint yet.",
    },
        {
          label: "In Sprint",
          value: stats.in_sprint_tasks,
          share: getPercent(stats.in_sprint_tasks, stats.total_tasks),
          storyPoints: stats.in_sprint_story_points,
          helper: "Tasks that are actively planned into a sprint right now.",
        },
      ]
    : [];
  const teamStoryPointSegments = stats
    ? getPieChartSegments(stats.story_points_by_team, stats.total_story_points)
    : [];

  return (
    <div className="min-h-screen bg-[#f5ede3] text-[#3e2a1f]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid gap-8 lg:grid-cols-[260px_1fr]">

          {/* LEFT SIDEBAR */}
            <aside className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-6 shadow-md">
            <h2 className="mb-6 text-2xl font-bold text-[#5c3b28]">
                Menu
            </h2>

            <div className="space-y-4">
                <Link
                href={`/projects/${id}/board`}
                className="block w-full rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3 text-left text-[#4b2e1f] font-medium transition hover:-translate-y-1 hover:shadow"
                >
                Board
                </Link>

                
            </div>
            <div className="space-y-4">
                <Link
                href={`/projects/${id}/backlog`}
                className="block w-full rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3 text-left text-[#4b2e1f] font-medium transition hover:-translate-y-1 hover:shadow"
                >
                Backlog
                </Link>

                
            </div>
            <div className="space-y-4">
                <Link
                href={`/projects/${id}/selectTeam`}
                className="block w-full rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3 text-left text-[#4b2e1f] font-medium transition hover:-translate-y-1 hover:shadow"
                >
                Select Team
                </Link>

                
            </div>
            </aside>


          {/* MAIN CONTENT */}
          <div className="space-y-8">
            {stats && (
              <div className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-8 shadow-md">
                <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#8b5e3c]">
                      Project Statistics
                    </p>
                    <h2 className="mt-2 text-3xl font-bold text-[#5c3b28]">Task Distribution</h2>
                    <p className="mt-2 max-w-2xl text-[#6f4e37]">
                      Hover a section to see how work is flowing from backlog into active sprint planning.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#d4b08a] bg-[#fdf7f2] px-5 py-4 text-right">
                    <p className="text-sm uppercase tracking-[0.2em] text-[#8b5e3c]">Project Totals</p>
                    <p className="mt-2 text-3xl font-bold text-[#5c3b28]">{stats.total_tasks} tasks</p>
                    <p className="text-[#6f4e37]">{formatPoints(stats.total_story_points)} story points</p>
                  </div>
                </div>

                <div className="mb-6 flex h-4 overflow-hidden rounded-full border border-[#d4b08a] bg-[#f1e3d5]">
                  {statCards.map((card, index) => (
                    <div
                      key={card.label}
                      className={index === 0 ? "bg-[#9f6b44]" : index === 1 ? "bg-[#7b8f4a]" : "bg-[#7a739b]"}
                      style={{ width: `${card.share}%` }}
                      title={`${card.label}: ${card.value} tasks, ${card.share}% of project tasks`}
                    />
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  {statCards.map((card, index) => (
                    <div
                      key={card.label}
                      className="group rounded-2xl border border-[#d9c1a7] bg-[#fffaf5] p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                      title={`${card.label}: ${card.value} tasks, ${formatPoints(card.storyPoints)} story points`}
                    >
                      <div className="mb-5 flex items-center justify-between">
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b5e3c]">
                          {card.label}
                        </p>
                        <span className="text-xs text-[#a67c5b]">{index + 1}/3</span>
                      </div>
                      <p className="text-4xl font-bold text-[#5c3b28]">{card.value}</p>
                      <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[#6f4e37]">
                        <span>{formatPoints(card.storyPoints)} pts</span>
                        <span>{card.share}%</span>
                      </div>
                      <div className="mt-4 h-px bg-[#ead8c6]" />
                      <p className="mt-4 text-sm leading-6 text-[#8a6a52] transition group-hover:text-[#4b2e1f]">
                        {card.helper}
                      </p>
                    </div>
                  ))}
                </div>

                {stats.total_story_points > 0 && (
                  <div className="mt-8 rounded-2xl border border-[#d9c1a7] bg-[#fdf7f2] p-6">
                    <div className="mb-6 flex flex-col gap-2">
                      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#8b5e3c]">
                        Story Points
                      </p>
                      <h3 className="text-2xl font-bold text-[#5c3b28]">Distribution Across Teams</h3>
                      <p className="max-w-2xl text-[#6f4e37]">
                        Hover each slice to see how many story points belong to a team or remain unassigned.
                      </p>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-[320px_1fr] lg:items-center">
                      <div className="mx-auto">
                        <svg viewBox="0 0 240 240" className="h-[240px] w-[240px]">
                          {teamStoryPointSegments.map((segment) => (
                            segment.angle > 0 ? (
                              <path
                                key={segment.label}
                                d={describeArc(120, 120, 100, segment.startAngle, segment.endAngle)}
                                fill={segment.color}
                              >
                                <title>
                                  {`${segment.label}: ${formatPoints(segment.story_points)} story points (${segment.share}%)`}
                                </title>
                              </path>
                            ) : null
                          ))}
                          <circle cx="120" cy="120" r="54" fill="#fdf7f2" />
                          <text x="120" y="110" textAnchor="middle" className="fill-[#8b5e3c] text-[12px] font-semibold">
                            Total
                          </text>
                          <text x="120" y="136" textAnchor="middle" className="fill-[#5c3b28] text-[22px] font-bold">
                            {formatPoints(stats.total_story_points)}
                          </text>
                        </svg>
                      </div>

                      <div className="grid gap-3">
                        {teamStoryPointSegments.map((segment) => (
                          <div
                            key={segment.label}
                            className="flex items-center justify-between rounded-xl border border-[#ead8c6] bg-[#fffaf5] px-4 py-3"
                            title={`${segment.label}: ${formatPoints(segment.story_points)} story points (${segment.share}%)`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="h-3.5 w-3.5 rounded-full"
                                style={{ backgroundColor: segment.color }}
                              />
                              <span className="font-medium text-[#4b2e1f]">{segment.label}</span>
                            </div>
                            <div className="text-right text-sm text-[#6f4e37]">
                              <div>{formatPoints(segment.story_points)} pts</div>
                              <div>{segment.share}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!stats && statsError && (
              <div className="rounded-2xl border border-[#d4b08a] bg-[#fff7ef] p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b5e3c]">
                  Project Statistics
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[#5c3b28]">Statistics unavailable</h2>
                <p className="mt-3 max-w-3xl text-[#6f4e37]">
                  {statsError} The project page still works, but the{" "}
                  <code className="rounded bg-[#f3e4d6] px-1.5 py-0.5 text-[#5c3b28]">/api/projects/:id/stats</code>{" "}
                  request is failing and this screen used to hide that completely.
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-8 shadow-md">
              <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <h1 className="text-4xl font-bold text-[#5c3b28]">
                  {project.name}
                </h1>

                {project.is_owner && (
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/projects/${id}/manageProject`}
                      className="rounded-xl bg-[#8b5e3c] px-5 py-2 font-semibold text-white transition hover:bg-[#734c30]"
                    >
                      Manage Project
                    </Link>

                    <Link
                      href={`/projects/${id}/manageTeam`}
                      className="rounded-xl bg-[#8b5e3c] px-5 py-2 font-semibold text-white transition hover:bg-[#734c30]"
                    >
                      Manage Teams
                    </Link>
                  </div>
                )}
              </div>

              <p className="text-lg text-[#6f4e37]">
                {project.description ?? "No description available."}
              </p>
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}
