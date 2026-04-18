import TaskCard from "./task-card";

type Task = {
  id_task: number;
  name: string | null;
  description: string | null;
  story_points: number | null;
  risk: number | null;
  priority: number | null;
  workflow_status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  board_order: number;
};

type KanbanColumnProps = {
  title: string;
  tasks: Task[];
  isDropTarget?: boolean;
  onDropTask?: () => void;
  onDragOverColumn?: () => void;
  onDragLeaveColumn?: () => void;
  onDragStartTask?: (taskId: number) => void;
  onDragEndTask?: () => void;
};

const STATUS_ACCENT: Record<string, string> = {
  TODO: "#555",
  IN_PROGRESS: "#39ff14",
  IN_REVIEW: "#00d4ff",
  DONE: "#888",
};

export default function KanbanColumn({
  title, tasks, isDropTarget = false,
  onDropTask, onDragOverColumn, onDragLeaveColumn, onDragStartTask, onDragEndTask,
}: KanbanColumnProps) {
  const statusKey = title.replace(/ /g, "_").toUpperCase();
  const accentColor = STATUS_ACCENT[statusKey] ?? "#555";

  return (
    <section
      onDragOver={(e) => { e.preventDefault(); onDragOverColumn?.(); }}
      onDragLeave={() => onDragLeaveColumn?.()}
      onDrop={(e) => { e.preventDefault(); onDropTask?.(); }}
      className={`rounded-xl border p-4 transition ${
        isDropTarget ? "border-[#39ff14]/30 bg-[rgba(57,255,20,0.04)]" : "border-[#1e1e1e] bg-[#0d0d0d]"
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[#888]">{title}</h3>
        </div>
        <span className="rounded border border-[#1a1a1a] bg-[#111] px-2 py-0.5 text-xs text-[#444]">{tasks.length}</span>
      </div>

      <div className="space-y-2.5">
        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#1a1a1a] px-4 py-5 text-center text-xs text-[#333]">
            Drop tasks here
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id_task} task={task} onDragStart={onDragStartTask} onDragEnd={onDragEndTask} />
          ))
        )}
      </div>
    </section>
  );
}
