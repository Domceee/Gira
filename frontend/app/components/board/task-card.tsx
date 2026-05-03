"use client";

import { useRef, useState } from "react";
import TaskDetailsModal from "@/app/components/tasks/TaskDetailsModal";

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
    fk_team_memberid_team_member?: number | null;

    // ⭐ Add these
    multiplePeople: boolean;
    assignees?: number[];
    assignee_user_id?: number | null;
    assignee_name?: string | null;
  };
  members?: {
    id_team_member: number;
    name: string;
  }[];
  onDragStart?: (taskId: number) => void;
  onDragEnd?: () => void;
};

export default function TaskCard({ task, members, onDragStart, onDragEnd }: TaskCardProps) {
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
        <TaskDetailsModal task={task} members={members} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

