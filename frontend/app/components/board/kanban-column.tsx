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

export default function KanbanColumn({
  title,
  tasks,
  isDropTarget = false,
  onDropTask,
  onDragOverColumn,
  onDragLeaveColumn,
  onDragStartTask,
  onDragEndTask,
}: KanbanColumnProps) {
  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        onDragOverColumn?.();
      }}
      onDragLeave={() => onDragLeaveColumn?.()}
      onDrop={(event) => {
        event.preventDefault();
        onDropTask?.();
      }}
      className={`rounded-2xl border p-4 transition ${
        isDropTarget
          ? "border-[#8b5e3c] bg-[#f7efe7]"
          : "border-[#d4b08a] bg-[#fdf7f2]"
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b5e3c]">
          {title}
        </h3>
        <span className="rounded-full bg-[#ead8c6] px-2.5 py-1 text-xs font-medium text-[#6f4e37]">
          {tasks.length}
        </span>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d9c1a7] bg-[#fffaf5] px-4 py-6 text-center text-sm text-[#8a6a52]">
            No tasks in this column.
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id_task}
              task={task}
              onDragStart={onDragStartTask}
              onDragEnd={onDragEndTask}
            />
          ))
        )}
      </div>
    </section>
  );
}
