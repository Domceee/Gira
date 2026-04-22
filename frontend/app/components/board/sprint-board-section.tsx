import KanbanBoard from "./kanban-board";
import SwimlaneBoard from "./swimlane-board";

type BoardTask = {
  id_task: number;
  name: string | null;
  description: string | null;
  story_points: number | null;
  risk: number | null;
  priority: number | null;
  workflow_status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  board_order: number;
  fk_team_memberid_team_member: number | null;
  assignee_user_id: number | null;
  assignee_name: string | null;
};

type BoardMember = {
  team_member_id: number;
  user_id: number;
  name: string;
};

type SprintBoardSectionProps = {
  useSwimlaneBoard: boolean;
  board: {
    sprint_id: number;
    team_id: number;
    team_name: string | null;
    start_date: string;
    end_date: string;
    members: BoardMember[];
    tasks: BoardTask[];
  };
};

function formatDate(d: string) {
  return new Date(d).toISOString().split("T")[0];
}

export default function SprintBoardSection({ board, useSwimlaneBoard }: SprintBoardSectionProps) {
  return (
    <section className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-6">
      <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#39e7ac]">
            {board.team_name ?? `Team ${board.team_id}`}
          </p>
          <h2 className="mt-1 text-lg font-bold text-[#ffffff]">Sprint {board.sprint_id}</h2>
        </div>
        <div className="rounded-lg border border-[#667386] bg-[#28313d] px-3 py-2 text-xs text-[#c3ceda]">
          {formatDate(board.start_date)} → {formatDate(board.end_date)}
        </div>
      </div>
      {useSwimlaneBoard ? (
        <SwimlaneBoard members={board.members} tasks={board.tasks} />
      ) : (
        <KanbanBoard tasks={board.tasks} />
      )}
    </section>
  );
}

