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
        className="cursor-grab rounded-lg border border-[#7a8798] bg-[#28313d] p-3.5 transition hover:border-[#7b8798] hover:bg-[#3a414d] active:cursor-grabbing"
      >
        <h4 className="text-sm font-semibold text-[#ffffff]">{task.name ?? "Untitled task"}</h4>
        <p
          className="mt-2 text-xs leading-5 text-[#c3ceda]"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {task.description?.trim() || "No description."}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          <span className="rounded border border-[#667386] bg-[#1f2630] px-2 py-0.5 text-[#c3ceda]">{task.story_points ?? 0} pts</span>
          <span className="rounded border border-[#667386] bg-[#1f2630] px-2 py-0.5 text-[#c3ceda]">Risk: {getRiskOrPriorityLabel(task.risk)}</span>
          <span className="rounded border border-[#667386] bg-[#1f2630] px-2 py-0.5 text-[#c3ceda]">Priority: {getRiskOrPriorityLabel(task.priority)}</span>
        </div>
      </article>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-xl rounded-xl border border-[#7a8798] bg-[#1f2630] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#39e7ac]">Task Details</p>
                <h3 className="mt-1.5 text-xl font-bold text-[#ffffff]">{task.name ?? "Untitled task"}</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-1.5 text-xs text-[#edf3fb] transition hover:bg-[#323d4b] hover:text-[#ffffff]">
                Close
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded border border-[#667386] bg-[#28313d] px-2.5 py-1 text-xs text-[#c3ceda]">{task.story_points ?? 0} pts</span>
              <span className="rounded border border-[#667386] bg-[#28313d] px-2.5 py-1 text-xs text-[#c3ceda]">Risk: {getRiskOrPriorityLabel(task.risk)}</span>
              <span className="rounded border border-[#667386] bg-[#28313d] px-2.5 py-1 text-xs text-[#c3ceda]">Priority: {getRiskOrPriorityLabel(task.priority)}</span>
            </div>
            <div className="mt-5 rounded-lg border border-[#667386] bg-[#28313d] p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#c3ceda]">Description</p>
              <p className="mt-2.5 whitespace-pre-wrap text-sm leading-6 text-[#edf3fb]">
                {task.description?.trim() || "No description provided."}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

