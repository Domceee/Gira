"use client";

import { useRef, useState } from "react";

const RISK_AND_PRIORITY_LABELS: Record<number, string> = {
  1: "Very low",
  2: "Low",
  3: "Medium",
  4: "High",
  5: "Very high",
};

function getRiskOrPriorityLabel(value: number | null) {
  if (value === null) {
    return "-";
  }

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
          if (dragStartedRef.current) {
            dragStartedRef.current = false;
            return;
          }
          setOpen(true);
        }}
        onDragStart={() => {
          dragStartedRef.current = true;
          onDragStart?.(task.id_task);
        }}
        onDragEnd={() => {
          onDragEnd?.();
          window.setTimeout(() => {
            dragStartedRef.current = false;
          }, 0);
        }}
        className="cursor-grab rounded-xl border border-[#d9c1a7] bg-[#fffaf5] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
      >
        <div className="flex items-start gap-3">
          <h4 className="text-sm font-semibold text-[#4b2e1f]">
            {task.name ?? "Untitled task"}
          </h4>
        </div>

        <p
          className="mt-3 text-sm leading-6 text-[#6f4e37]"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {task.description?.trim() || "No description provided."}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#7d624a]">
          <span className="rounded-full bg-[#f3e4d6] px-2.5 py-1">
            {task.story_points ?? 0} pts
          </span>
          <span className="rounded-full bg-[#f3e4d6] px-2.5 py-1">
            Risk: {getRiskOrPriorityLabel(task.risk)}
          </span>
          <span className="rounded-full bg-[#f3e4d6] px-2.5 py-1">
            Priority: {getRiskOrPriorityLabel(task.priority)}
          </span>
        </div>
      </article>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-[#d4b08a] bg-[#fffaf5] p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b5e3c]">
                  Task Details
                </p>
                <h3 className="mt-2 text-2xl font-bold text-[#5c3b28]">
                  {task.name ?? "Untitled task"}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-[#d4b08a] bg-[#fdf7f2] px-3 py-2 text-sm font-medium text-[#4b2e1f] transition hover:bg-[#f3e4d6]"
              >
                Close
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 text-sm text-[#7d624a]">
              <span className="rounded-full bg-[#f3e4d6] px-3 py-1.5">
                {task.story_points ?? 0} pts
              </span>
              <span className="rounded-full bg-[#f3e4d6] px-3 py-1.5">
                Risk: {getRiskOrPriorityLabel(task.risk)}
              </span>
              <span className="rounded-full bg-[#f3e4d6] px-3 py-1.5">
                Priority: {getRiskOrPriorityLabel(task.priority)}
              </span>
            </div>

            <div className="mt-6 rounded-xl border border-[#ead8c6] bg-[#fdf7f2] p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b5e3c]">
                Description
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#4b2e1f]">
                {task.description?.trim() || "No description provided."}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
