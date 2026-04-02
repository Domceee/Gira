import Navbar from "@/app/components/navbar";
import SprintBoardSection from "@/app/components/board/sprint-board-section";
import { apiFetch } from "@/app/lib/api";
import Link from "next/link";

type BoardTask = {
  id_task: number;
  name: string | null;
  description: string | null;
  story_points: number | null;
  risk: number | null;
  priority: number | null;
  fk_teamid_team: number | null;
  fk_sprintid_sprint: number | null;
  workflow_status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  board_order: number;
};

type SprintBoard = {
  sprint_id: number;
  team_id: number;
  team_name: string | null;
  start_date: string;
  end_date: string;
  tasks: BoardTask[];
};

type ProjectBoard = {
  project_id: number;
  boards: SprintBoard[];
};

async function getProjectBoard(projectId: string) {
  const res = await apiFetch(`/api/projects/${projectId}/board`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch project board");
  }

  return res.json() as Promise<ProjectBoard>;
}

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projectBoard = await getProjectBoard(id);

  return (
    <div className="min-h-screen bg-[#f5ede3] text-[#3e2a1f]">
      <Navbar />

      <main className="w-full px-6 py-8 xl:px-10 2xl:px-14">
        <div className="space-y-8">
          <div className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-8 shadow-md">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#8b5e3c]">
                  Project Board
                </p>
                <h1 className="mt-2 text-4xl font-bold text-[#5c3b28]">
                  Active Sprint Boards
                </h1>
              </div>

              <Link
                href={`/projects/${id}`}
                className="inline-flex items-center justify-center rounded-xl border border-[#c8a27a] bg-[#fdf7f2] px-5 py-3 text-sm font-semibold text-[#4b2e1f] transition hover:-translate-y-0.5 hover:shadow"
              >
                Back to Project
              </Link>
            </div>
          </div>

          {projectBoard.boards.length === 0 ? (
            <div className="rounded-2xl border border-[#d4b08a] bg-[#fff7ef] p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-[#5c3b28]">
                No active sprint boards
              </h2>
              <p className="mt-3 text-[#6f4e37]">
                There are no active sprints for this project right now, so there is
                nothing to display on the board page yet.
              </p>
            </div>
          ) : (
            projectBoard.boards.map((board) => (
              <SprintBoardSection
                key={`${board.team_id}-${board.sprint_id}`}
                board={board}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
