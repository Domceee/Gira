"use client";

import {
  type DragEventHandler,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
  useState,
} from "react";
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
  multiplePeople: boolean;
  assignees?: number[];
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
  onClick?: MouseEventHandler<HTMLDivElement>;
  onDragStart?: DragEventHandler<HTMLDivElement>;
  onDragEnd?: DragEventHandler<HTMLDivElement>;
  // --- Added these to fix your TS errors ---
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function isInteractiveClick(event: MouseEvent<HTMLElement>) {
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
  open: controlledOpen, // Renamed to avoid confusion with local state
  onOpenChange,
}: TaskDetailsTriggerProps) {
  // Use local state if 'open' prop isn't provided (uncontrolled mode)
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Determine if we are controlled by the parent or using local state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const setOpen = (value: boolean) => {
    setInternalOpen(value);
    onOpenChange?.(value);
  };

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    onClick?.(event);

    if (event.defaultPrevented || isInteractiveClick(event)) return;

    setOpen(true);
  }

  return (
    <>
      <div
        draggable={draggable}
        onClick={handleClick}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className={className}
        style={{ width: "100%", height: "100%" }}
      >
        {children}
      </div>

      {isOpen &&
        createPortal(
          <TaskDetailsModal
            task={task}
            members={members}
            onClose={() => setOpen(false)}
          />,
          document.body
        )}
    </>
  );
}