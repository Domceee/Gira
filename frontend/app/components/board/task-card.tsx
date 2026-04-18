"use client";

import { useRef, useState } from "react";

const RISK_AND_PRIORITY_LABELS: Record<number, string> = {
  1: "Very low", 2: "Low", 3: "Medium", 4: "High", 5: "Very high",
};

function getRiskOrPriorityLabel(value: number | null) {
  if (value === null) return "-";
  return RISK_AND_PRIORITY_LABELS[value] ?? "Unknown";
}

type TaskCardProps = {
  task: {
    id_task: number;
    name: string | null;
    description: string | null;
    story_points: number | null;
    risk: number | null;
    priority: number | null;
  };
  onDragStart?: (taskId: number) => void;
  onDragEnd?: () => void;
};

export default function TaskCard({ task, onDragStart, onDragEnd }: TaskCardProps) {
  const [open, setOpen] = useState(false);
  const dragStartedRef = useRef(false);

  return (
    <>
      <article
        draggable
        onClick={() => {
          if (dragStartedRef.current) { dragStartedRef.current = false; return; }
          setOpen(true);
        }}
        onDragStart={() => { dragStartedRef.current = true; onDragStart?.(task.id_task); }}
        onDragEnd={() => { onDragEnd?.(); window.setTimeout(() => { dragStartedRef.current = false; }, 0); }}
        className="cursor-grab rounded-lg border border-[#1e1e1e] bg-[#111] p-3.5 transition hover:border-[#2a2a2a] hover:bg-[#141414] active:cursor-grabbing"
      >
        <h4 className="text-sm font-semibold text-[#f0f0f0]">{task.name ?? "Untitled task"}</h4>
        <p
          className="mt-2 text-xs leading-5 text-[#555]"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {task.description?.trim() || "No description."}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          <span className="rounded border border-[#1a1a1a] bg-[#0d0d0d] px-2 py-0.5 text-[#555]">{task.story_points ?? 0} pts</span>
          <span className="rounded border border-[#1a1a1a] bg-[#0d0d0d] px-2 py-0.5 text-[#555]">Risk: {getRiskOrPriorityLabel(task.risk)}</span>
          <span className="rounded border border-[#1a1a1a] bg-[#0d0d0d] px-2 py-0.5 text-[#555]">Priority: {getRiskOrPriorityLabel(task.priority)}</span>
        </div>
      </article>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-xl rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#39ff14]">Task Details</p>
                <h3 className="mt-1.5 text-xl font-bold text-[#f0f0f0]">{task.name ?? "Untitled task"}</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-[#1e1e1e] bg-[#111] px-3 py-1.5 text-xs text-[#888] transition hover:bg-[#161616] hover:text-[#f0f0f0]">
                Close
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded border border-[#1a1a1a] bg-[#111] px-2.5 py-1 text-xs text-[#555]">{task.story_points ?? 0} pts</span>
              <span className="rounded border border-[#1a1a1a] bg-[#111] px-2.5 py-1 text-xs text-[#555]">Risk: {getRiskOrPriorityLabel(task.risk)}</span>
              <span className="rounded border border-[#1a1a1a] bg-[#111] px-2.5 py-1 text-xs text-[#555]">Priority: {getRiskOrPriorityLabel(task.priority)}</span>
            </div>
            <div className="mt-5 rounded-lg border border-[#1a1a1a] bg-[#111] p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#444]">Description</p>
              <p className="mt-2.5 whitespace-pre-wrap text-sm leading-6 text-[#888]">
                {task.description?.trim() || "No description provided."}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
