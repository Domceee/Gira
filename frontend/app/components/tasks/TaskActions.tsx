"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { deleteTask, editTask } from "../../projects/[id]/backlog/actions";


type TaskActionsProps = {
  taskId: number;
  projectId: string;
  name: string;
  description: string | null;
  story_points: number | null;
  risk: number | null;
  priority: number | null;
};

const RiskAndPriority = [
  { id: 1, name: "Very low" },
  { id: 2, name: "Low" },
  { id: 3, name: "Medium" },
  { id: 4, name: "High" },
  { id: 5, name: "Very high" },
];

let currentOpenTaskId: number | null = null;
const closeMenuCallbacks = new Map<number, () => void>();

export default function TaskActions({
  taskId,
  projectId,
  name,
  description,
  story_points,
  risk,
  priority,
}: TaskActionsProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    closeMenuCallbacks.set(taskId, () => setOpen(false));
    return () => {
      closeMenuCallbacks.delete(taskId);
      if (currentOpenTaskId === taskId) {
        currentOpenTaskId = null;
      }
    };
  }, [taskId]);

  useEffect(() => {
    if (open) {
      currentOpenTaskId = taskId;
    } else if (currentOpenTaskId === taskId) {
      currentOpenTaskId = null;
    }
  }, [open, taskId]);

  useEffect(() => {
    if (!open && !editing) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setEditing(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open, editing]);

  const handleToggle = () => {
    if (editing) {
      setEditing(false);
    }

    if (!open) {
      if (currentOpenTaskId !== null && currentOpenTaskId !== taskId) {
        const closeOther = closeMenuCallbacks.get(currentOpenTaskId);
        if (closeOther) {
          closeOther();
        }
      }
      setOpen(true);
      currentOpenTaskId = taskId;
    } else {
      setOpen(false);
      if (currentOpenTaskId === taskId) {
        currentOpenTaskId = null;
      }
    }
  };

  const handleStartEdit = () => {
    setOpen(false);
    setEditing(true);
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left overflow-visible">
      <button
        type="button"
        onClick={handleToggle}
        className="p-2 rounded hover:bg-gray-200"
      >
        <MoreHorizontal size={20} />
      </button>

      {open && !editing && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-md bg-white shadow-lg border border-gray-200 z-[9999]">
          <form action={deleteTask}>
            <input type="hidden" name="task_id" value={taskId} />
            <input type="hidden" name="project_id" value={projectId} />
            <button
              type="submit"
              className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </form>

          <button
            type="button"
            onClick={handleStartEdit}
            className="w-full text-left px-4 py-2 hover:bg-gray-50"
          >
            Edit
          </button>
        </div>
      )}

      {editing && (
        <div className="absolute right-0 top-full mt-2 w-[320px] rounded-md bg-white shadow-lg border border-gray-200 z-[9999] p-4">
          <form action={editTask} className="space-y-3">
            <input type="hidden" name="task_id" value={taskId} />
            <input type="hidden" name="project_id" value={projectId} />

            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input
                name="name"
                required
                defaultValue={name}
                className="w-full rounded-lg border border-[#c8a27a] p-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <textarea
                name="description"
                defaultValue={description ?? ""}
                className="w-full rounded-lg border border-[#c8a27a] p-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Story Points</label>
                <input
                  type="number"
                  step="0.1"
                  name="story_points"
                  defaultValue={story_points ?? ""}
                  className="w-full rounded-lg border border-[#c8a27a] p-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Risk</label>
                <select
                  name="risk"
                  defaultValue={risk ?? ""}
                  className="w-full rounded-lg border border-[#c8a27a] p-2"
                >
                  <option value="" disabled>Select risk</option>
                  {RiskAndPriority.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Priority</label>
              <select
                name="priority"
                defaultValue={priority ?? ""}
                className="w-full rounded-lg border border-[#c8a27a] p-2"
              >
                <option value="" disabled>Select priority</option>
                {RiskAndPriority.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="submit"
                className="rounded-lg bg-[#b08968] px-4 py-2 text-white hover:bg-[#8c6a4f]"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-[#c8a27a] px-4 py-2 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}