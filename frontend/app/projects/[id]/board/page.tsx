import SprintBoardSection from "@/app/components/board/sprint-board-section";
import { apiFetch } from "@/app/lib/api";
import { requireAuth } from "@/app/lib/auth";

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
  const res = await apiFetch(`/api/projects/${projectId}/board`, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch project board");
  return res.json() as Promise<ProjectBoard>;
}

export default async function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const projectBoard = await getProjectBoard(id);

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#39ff14]">Board</p>
        <h1 className="mt-1 text-2xl font-bold text-[#f0f0f0]">Active Sprints</h1>
      </div>

      {projectBoard.boards.length === 0 ? (
        <div className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-6">
          <h2 className="text-lg font-bold text-[#f0f0f0]">No active sprint boards</h2>
          <p className="mt-2 text-sm text-[#555]">
            There are no active sprints for this project right now.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {projectBoard.boards.map((board) => (
            <SprintBoardSection key={`${board.team_id}-${board.sprint_id}`} board={board} />
          ))}
        </div>
      )}
    </div>
  );
}
