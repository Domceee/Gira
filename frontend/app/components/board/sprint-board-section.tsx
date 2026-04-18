import KanbanBoard from "./kanban-board";

type BoardTask = {
  id_task: number;
  name: string | null;
  description: string | null;
  story_points: number | null;
  risk: number | null;
  priority: number | null;
  workflow_status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  board_order: number;
};

type SprintBoardSectionProps = {
  board: {
    sprint_id: number;
    team_id: number;
    team_name: string | null;
    start_date: string;
    end_date: string;
    tasks: BoardTask[];
  };
};

function formatDate(d: string) {
  return new Date(d).toISOString().split("T")[0];
}

export default function SprintBoardSection({ board }: SprintBoardSectionProps) {
  return (
    <section className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-6">
      <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#39ff14]">
            {board.team_name ?? `Team ${board.team_id}`}
          </p>
          <h2 className="mt-1 text-lg font-bold text-[#f0f0f0]">Sprint {board.sprint_id}</h2>
        </div>
        <div className="rounded-lg border border-[#1a1a1a] bg-[#111] px-3 py-2 text-xs text-[#555]">
          {formatDate(board.start_date)} → {formatDate(board.end_date)}
        </div>
      </div>
      <KanbanBoard tasks={board.tasks} />
    </section>
  );
}
