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

function formatDate(dateString: string) {
  return new Date(dateString).toISOString().split("T")[0];
}

export default function SprintBoardSection({ board }: SprintBoardSectionProps) {
  return (
    <section className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-6 shadow-md">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8b5e3c]">
            {board.team_name ?? `Team ${board.team_id}`}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#5c3b28]">
            Sprint {board.sprint_id}
          </h2>
        </div>

        <div className="rounded-xl border border-[#d4b08a] bg-[#fdf7f2] px-4 py-3 text-sm text-[#6f4e37]">
          {formatDate(board.start_date)} to {formatDate(board.end_date)}
        </div>
      </div>

      <KanbanBoard tasks={board.tasks} />
    </section>
  );
}
