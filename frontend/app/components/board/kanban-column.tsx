import TaskCard from "./task-card";

type Task = {
  id_task: number;
  name: string | null;
  description: string | null;
  story_points: number | null;
  risk: number | null;
  priority: number | null;
  fk_team_memberid_team_member: number | null;
  workflow_status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  board_order: number;
  multiplePeople: boolean;        
  assignees?: number[];      
};

type Member = {
  id_team_member: number;
  name: string;
};

type KanbanColumnProps = {
  title: string;
  members: Member[];
  tasks: Task[];
  isDropTarget?: boolean;
  onDropTask?: () => void;
  onDragOverColumn?: () => void;
  onDragLeaveColumn?: () => void;
  onDragStartTask?: (taskId: number) => void;
  onDragEndTask?: () => void;
};

const STATUS_ACCENT: Record<string, string> = {
  TODO: "#c3ceda",
  IN_PROGRESS: "#39e7ac",
  IN_REVIEW: "#00d4ff",
  DONE: "#edf3fb",
};

export default function KanbanColumn({
  title, members, tasks, isDropTarget = false,
  onDropTask, onDragOverColumn, onDragLeaveColumn, onDragStartTask, onDragEndTask,
}: KanbanColumnProps) {
  const statusKey = title.replace(/ /g, "_").toUpperCase();
  const accentColor = STATUS_ACCENT[statusKey] ?? "#c3ceda";

  return (
    <section
      onDragOver={(e) => { e.preventDefault(); onDragOverColumn?.(); }}
      onDragLeave={() => onDragLeaveColumn?.()}
      onDrop={(e) => { e.preventDefault(); onDropTask?.(); }}
      className={`rounded-xl border p-4 transition ${
        isDropTarget ? "border-[#39e7ac]/30 bg-[rgba(46,230,166,0.08)]" : "border-[#7a8798] bg-[#1f2630]"
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[#edf3fb]">{title}</h3>
        </div>
        <span className="rounded border border-[#667386] bg-[#28313d] px-2 py-0.5 text-xs text-[#c3ceda]">{tasks.length}</span>
      </div>

      <div className="space-y-2.5">
        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#667386] px-4 py-5 text-center text-xs text-[#93a0b1]">
            Drop tasks here
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id_task} task={task} members={members} onDragStart={onDragStartTask} onDragEnd={onDragEndTask} />
          ))
        )}
      </div>
    </section>
  );
}

