"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import KanbanColumn from "./kanban-column";
import { apiFetch } from "@/app/lib/api";
import { toast } from "react-hot-toast";

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

type KanbanBoardProps = {
  members: Member[];
  tasks: Task[];
};

const COLUMNS = [
  { key: "TODO", label: "TO DO" },
  { key: "IN_PROGRESS", label: "IN PROGRESS" },
  { key: "IN_REVIEW", label: "IN REVIEW" },
  { key: "DONE", label: "DONE" },
] as const;

export default function KanbanBoard({ members, tasks }: KanbanBoardProps) {
  const router = useRouter();
  const [boardTasks, setBoardTasks] = useState(tasks);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setBoardTasks(tasks);
  }, [tasks]);

  async function moveTaskToColumn(workflowStatus: Task["workflow_status"]) {
    if (draggedTaskId === null || isSaving) {
      return;
    }

    const draggedTask = boardTasks.find((task) => task.id_task === draggedTaskId);
    if (!draggedTask) {
      return;
    }

    if (draggedTask.workflow_status === workflowStatus) {
      setDraggedTaskId(null);
      setActiveDropColumn(null);
      return;
    }

    const targetTasks = boardTasks.filter(
      (task) => task.workflow_status === workflowStatus && task.id_task !== draggedTaskId
    );
    const nextBoardOrder = targetTasks.length;

    const optimisticTasks = boardTasks.map((task) =>
      task.id_task === draggedTaskId
        ? { ...task, workflow_status: workflowStatus, board_order: nextBoardOrder }
        : task
    );

    setBoardTasks(optimisticTasks);
    setMoveError(null);
    setDraggedTaskId(null);
    setActiveDropColumn(null);
    setIsSaving(true);

    try {
      const response = await apiFetch(`/api/tasks/${draggedTaskId}/board-position`, {
        method: "PATCH",
        body: JSON.stringify({
          workflow_status: workflowStatus,
          board_order: nextBoardOrder,
        }),
      });

      if (!response.ok) {
        setBoardTasks(tasks);
        setMoveError("Task move could not be saved. The board has been refreshed.");
        toast.error("Task move could not be saved. The board has been refreshed.");
        return;
      }

      toast.success("Task moved successfully");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setBoardTasks(tasks);
      setMoveError("Task move could not be saved. Please try again.");
      toast.error("Task move could not be saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {moveError && (
        <div className="rounded-xl border border-[#d4b08a] bg-[#fff7ef] px-4 py-3 text-sm text-[#7a3d2b]">
          {moveError}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-4">
        {COLUMNS.map((column) => {
          const columnTasks = boardTasks
            .filter((task) => task.workflow_status === column.key)
            .sort((a, b) => a.board_order - b.board_order || a.id_task - b.id_task);

          return (
            <KanbanColumn
              key={column.key}
              title={column.label}
              members={members}
              tasks={columnTasks}
              isDropTarget={activeDropColumn === column.key}
              onDragStartTask={(taskId) => {
                if (!isSaving) {
                  setMoveError(null);
                  setDraggedTaskId(taskId);
                }
              }}
              onDragEndTask={() => {
                setDraggedTaskId(null);
                setActiveDropColumn(null);
              }}
              onDragOverColumn={() => {
                if (draggedTaskId !== null && !isSaving) {
                  setActiveDropColumn(column.key);
                }
              }}
              onDragLeaveColumn={() => {
                if (activeDropColumn === column.key) {
                  setActiveDropColumn(null);
                }
              }}
              onDropTask={() => {
                void moveTaskToColumn(column.key);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
