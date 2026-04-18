"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { apiFetch } from "@/app/lib/api";

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
  { id: 1, name: "Very low" }, { id: 2, name: "Low" }, { id: 3, name: "Medium" },
  { id: 4, name: "High" }, { id: 5, name: "Very high" },
];

let currentOpenTaskId: number | null = null;
const closeMenuCallbacks = new Map<number, () => void>();

export default function TaskActions({ taskId, projectId, name, description, story_points, risk, priority }: TaskActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleDelete = async () => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const response = await apiFetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!response.ok) { setDeleteError("Failed to delete task."); return; }
      setOpen(false);
      router.refresh();
    } catch { setDeleteError("Failed to delete task. Please try again."); }
    finally { setIsDeleting(false); }
  };

  const handleEdit = async (formData: FormData) => {
    setEditError(null);
    setIsEditing(true);
    try {
      const payload = {
        name: formData.get("name"),
        description: formData.get("description"),
        story_points: formData.get("story_points") ? Number(formData.get("story_points")) : null,
        risk: formData.get("risk") ? Number(formData.get("risk")) : null,
        priority: formData.get("priority") ? Number(formData.get("priority")) : null,
      };
      const response = await apiFetch(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(payload) });
      if (!response.ok) { setEditError("Failed to edit task."); return; }
      setEditing(false);
      setOpen(false);
      router.refresh();
    } catch { setEditError("Failed to edit task. Please try again."); }
    finally { setIsEditing(false); }
  };

  useEffect(() => {
    closeMenuCallbacks.set(taskId, () => setOpen(false));
    return () => { closeMenuCallbacks.delete(taskId); if (currentOpenTaskId === taskId) currentOpenTaskId = null; };
  }, [taskId]);

  useEffect(() => {
    if (open) currentOpenTaskId = taskId;
    else if (currentOpenTaskId === taskId) currentOpenTaskId = null;
  }, [open, taskId]);

  useEffect(() => {
    if (!open && !editing) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) { setOpen(false); setEditing(false); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, editing]);

  const handleToggle = () => {
    if (editing) setEditing(false);
    if (!open) {
      if (currentOpenTaskId !== null && currentOpenTaskId !== taskId) closeMenuCallbacks.get(currentOpenTaskId)?.();
      setOpen(true);
      currentOpenTaskId = taskId;
    } else {
      setOpen(false);
      if (currentOpenTaskId === taskId) currentOpenTaskId = null;
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left overflow-visible">
      <button type="button" onClick={handleToggle} className="rounded p-1.5 text-[#444] transition hover:bg-[#161616] hover:text-[#f0f0f0]">
        <MoreHorizontal size={16} />
      </button>

      {open && !editing && (
        <div className="absolute right-0 top-full z-[9999] mt-1 w-44 overflow-hidden rounded-lg border border-[#1e1e1e] bg-[#111] shadow-xl">
          <button type="button" onClick={() => { setOpen(false); setEditing(true); }}
            className="w-full px-4 py-2.5 text-left text-sm text-[#ccc] transition hover:bg-[#161616] hover:text-[#f0f0f0]">
            Edit
          </button>
          <button type="button" onClick={handleDelete} disabled={isDeleting}
            className="w-full px-4 py-2.5 text-left text-sm text-[#ff8080] transition hover:bg-[#ff4040]/10 disabled:opacity-50">
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
          {deleteError && <p className="px-4 py-2 text-xs text-[#ff8080]">{deleteError}</p>}
        </div>
      )}

      {editing && (
        <div className="absolute right-0 top-full z-[9999] mt-1 w-80 rounded-lg border border-[#1e1e1e] bg-[#111] p-4 shadow-xl">
          <form action={handleEdit} className="space-y-3">
            <input type="hidden" name="task_id" value={taskId} />
            <input type="hidden" name="project_id" value={projectId} />
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#555]">Name</label>
              <input name="name" required defaultValue={name} className="w-full rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] px-3 py-2 text-sm text-[#f0f0f0] outline-none focus:border-[rgba(57,255,20,0.3)]" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#555]">Description</label>
              <textarea name="description" defaultValue={description ?? ""} rows={3} className="w-full rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] px-3 py-2 text-sm text-[#f0f0f0] outline-none focus:border-[rgba(57,255,20,0.3)]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#555]">Story Points</label>
                <input type="number" step="0.1" name="story_points" defaultValue={story_points ?? ""} className="w-full rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] px-3 py-2 text-sm text-[#f0f0f0] outline-none focus:border-[rgba(57,255,20,0.3)]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#555]">Risk</label>
                <select name="risk" defaultValue={risk ?? ""} className="w-full rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] px-3 py-2 text-sm text-[#f0f0f0] outline-none">
                  <option value="" disabled>Select</option>
                  {RiskAndPriority.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#555]">Priority</label>
              <select name="priority" defaultValue={priority ?? ""} className="w-full rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] px-3 py-2 text-sm text-[#f0f0f0] outline-none">
                <option value="" disabled>Select</option>
                {RiskAndPriority.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={isEditing}
                className="flex-1 rounded-lg border border-[rgba(57,255,20,0.3)] bg-[rgba(57,255,20,0.08)] py-2 text-sm font-bold text-[#39ff14] transition hover:bg-[rgba(57,255,20,0.14)] disabled:opacity-50">
                {isEditing ? "Saving..." : "Save"}
              </button>
              <button type="button" onClick={() => setEditing(false)}
                className="flex-1 rounded-lg border border-[#1e1e1e] py-2 text-sm text-[#888] transition hover:bg-[#161616]">
                Cancel
              </button>
            </div>
            {editError && <p className="text-xs text-[#ff8080]">{editError}</p>}
          </form>
        </div>
      )}
    </div>
  );
}
