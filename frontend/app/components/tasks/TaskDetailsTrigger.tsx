"use client";

import { type DragEventHandler, type MouseEvent, type MouseEventHandler, type ReactNode, useState } from "react";
import { createPortal } from "react-dom";
import TaskDetailsModal from "./TaskDetailsModal";

type TaskDetailsTask = {
  id_task: number;
  name: string | null;
  description: string | null;
  story_points: number | null;
  risk: number | null;
  priority: number | null;
  fk_team_memberid_team_member?: number | null;

  multiplePeople: boolean;        // NEW
  assignees?: number[];           // NEW
};

type AssignmentMember = {
  id_team_member: number;
  name: string;
};

type TaskDetailsTriggerProps = {
  task: TaskDetailsTask;
  members?: AssignmentMember[];
  className?: string;
  children: ReactNode;
  draggable?: boolean;
  onClick?: MouseEventHandler<HTMLTableRowElement>;
  onDragStart?: DragEventHandler<HTMLTableRowElement>;
  onDragEnd?: DragEventHandler<HTMLTableRowElement>;
};

function isInteractiveClick(event: MouseEvent<HTMLTableRowElement>) {
  return Boolean(
    (event.target as HTMLElement).closest(
      "a,button,input,select,textarea,form,[data-task-modal-ignore]"
    )
  );
}

export default function TaskDetailsTrigger({
  task,
  members,
  className,
  children,
  draggable,
  onClick,
  onDragStart,
  onDragEnd,
}: TaskDetailsTriggerProps) {
  const [open, setOpen] = useState(false);

  function handleClick(event: MouseEvent<HTMLTableRowElement>) {
    onClick?.(event);

    if (event.defaultPrevented || isInteractiveClick(event)) {
      return;
    }

    setOpen(true);
  }
  return (
    <>
      <tr
        draggable={draggable}
        onClick={handleClick}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className={className}
      >
        {children}
      </tr>
      {open && createPortal(
        <TaskDetailsModal task={task} members={members} onClose={() => setOpen(false)} />,
        document.body
      )}
    </>
  );
}
