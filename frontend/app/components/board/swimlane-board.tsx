"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/app/lib/api";
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
  fk_team_memberid_team_member: number | null;
  assignee_user_id: number | null;
  assignee_name: string | null;
};

type Member = {
  team_member_id: number;
  user_id: number;
  name: string;
};

type SwimlaneBoardProps = {
  members: Member[];
  tasks: Task[];
};

type StatusKey = Task["workflow_status"];

type Lane = {
  id: string;
  label: string;
  tasks: Task[];
};

const COLUMNS: Array<{ key: StatusKey; label: string }> = [
  { key: "TODO", label: "TO DO" },
  { key: "IN_PROGRESS", label: "IN PROGRESS" },
  { key: "IN_REVIEW", label: "IN REVIEW" },
  { key: "DONE", label: "DONE" },
];

const EMPTY_COUNTS: Record<StatusKey, number> = {
  TODO: 0,
  IN_PROGRESS: 0,
  IN_REVIEW: 0,
  DONE: 0,
};

function getLaneId(task: Task) {
  return task.fk_team_memberid_team_member === null ? "unassigned" : `member-${task.fk_team_memberid_team_member}`;
}

function buildLanes(tasks: Task[], members: Member[]): Lane[] {
  const grouped = new Map<string, Lane>();

  grouped.set("unassigned", {
    id: "unassigned",
    label: "Unassigned",
    tasks: [],
  });

  for (const member of members) {
    grouped.set(`member-${member.team_member_id}`, {
      id: `member-${member.team_member_id}`,
      label: member.name,
      tasks: [],
    });
  }

  for (const task of tasks) {
    const laneId = getLaneId(task);
    const existing = grouped.get(laneId);

    if (existing) {
      existing.tasks.push(task);
      continue;
    }

    grouped.set(laneId, {
      id: laneId,
      label: task.assignee_name?.trim() || "Unknown member",
      tasks: [task],
    });
  }

  const [unassignedLane, ...memberLanes] = Array.from(grouped.values());
  memberLanes.sort((a, b) => a.label.localeCompare(b.label));
  return [unassignedLane, ...memberLanes];
}

function getCounts(tasks: Task[]) {
  return tasks.reduce<Record<StatusKey, number>>((counts, task) => {
    counts[task.workflow_status] += 1;
    return counts;
  }, { ...EMPTY_COUNTS });
}

function getColumnAccent(status: StatusKey) {
  switch (status) {
    case "TODO":
      return "bg-[#c3ceda]";
    case "IN_PROGRESS":
      return "bg-[#39e7ac]";
    case "IN_REVIEW":
      return "bg-[#00d4ff]";
    case "DONE":
      return "bg-[#edf3fb]";
  }
}

function getTeamMemberIdForLane(laneId: string) {
  if (laneId === "unassigned") return null;
  return Number(laneId.replace("member-", ""));
}

export default function SwimlaneBoard({ members, tasks }: SwimlaneBoardProps) {
  const router = useRouter();
  const assignmentMembers = members.map((member) => ({
    id_team_member: member.team_member_id,
    name: member.name,
  }));
  const [boardTasks, setBoardTasks] = useState(tasks);
  const [expandedLanes, setExpandedLanes] = useState<Record<string, boolean>>({ unassigned: true });
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setBoardTasks(tasks);
    setExpandedLanes((current) => {
      const next: Record<string, boolean> = {};
      for (const lane of buildLanes(tasks, members)) {
        next[lane.id] = current[lane.id] ?? lane.id === "unassigned";
      }
      return next;
    });
  }, [members, tasks]);

  const lanes = useMemo(() => buildLanes(boardTasks, members), [boardTasks, members]);
  const draggedTask =
    draggedTaskId === null ? null : boardTasks.find((task) => task.id_task === draggedTaskId) ?? null;

  function toggleLane(laneId: string) {
    setExpandedLanes((current) => ({ ...current, [laneId]: !current[laneId] }));
  }

  async function moveTask(nextStatus: StatusKey, laneId: string) {
    if (draggedTaskId === null || draggedTask === null || isSaving) return;
    const nextTeamMemberId = getTeamMemberIdForLane(laneId);
    const targetLane = lanes.find((lane) => lane.id === laneId);
    const targetLaneExampleTask = boardTasks.find(
      (task) => task.id_task !== draggedTaskId && getLaneId(task) === laneId
    );

    if (
      draggedTask.workflow_status === nextStatus &&
      draggedTask.fk_team_memberid_team_member === nextTeamMemberId
    ) {
      setDraggedTaskId(null);
      setActiveDropTarget(null);
      return;
    }

    const targetTasks = boardTasks.filter(
      (task) =>
        getLaneId(task) === laneId &&
        task.workflow_status === nextStatus &&
        task.id_task !== draggedTaskId
    );
    const nextBoardOrder = targetTasks.length;

    const optimisticTasks = boardTasks.map((task) =>
      task.id_task === draggedTaskId
        ? {
            ...task,
            workflow_status: nextStatus,
            board_order: nextBoardOrder,
            fk_team_memberid_team_member: nextTeamMemberId,
            assignee_name: nextTeamMemberId === null ? null : targetLane?.label ?? task.assignee_name,
            assignee_user_id: nextTeamMemberId === null ? null : targetLaneExampleTask?.assignee_user_id ?? task.assignee_user_id,
          }
        : task
    );

    setBoardTasks(optimisticTasks);
    setMoveError(null);
    setDraggedTaskId(null);
    setActiveDropTarget(null);
    setIsSaving(true);

    try {
      const response = await apiFetch(`/api/tasks/${draggedTaskId}/board-position`, {
        method: "PATCH",
        body: JSON.stringify({
          workflow_status: nextStatus,
          board_order: nextBoardOrder,
          team_member_id: nextTeamMemberId,
        }),
      });

      if (!response.ok) {
        setBoardTasks(tasks);
        setMoveError("Task move could not be saved. The board has been refreshed.");
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setBoardTasks(tasks);
      setMoveError("Task move could not be saved. Please try again.");
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

      {lanes.map((lane) => {
        const counts = getCounts(lane.tasks);
        const isExpanded = expandedLanes[lane.id] ?? lane.id === "unassigned";

        return (
          <section key={lane.id} className="rounded-xl border border-[#7a8798] bg-[#28313d]">
            <button
              type="button"
              onClick={() => toggleLane(lane.id)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border-b border-[#7a8798] bg-[#222a35] px-3 py-2 text-left transition hover:bg-[#2b3542]"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#39e7ac]" />
                <p className="truncate text-[0.8rem] font-bold uppercase tracking-[0.16em] text-[#39e7ac]">
                  {lane.label}
                </p>
                <span className="rounded-full border border-[rgba(57,231,172,0.30)] bg-[rgba(57,231,172,0.13)] px-1.5 py-0.5 text-[10px] font-semibold text-[#dffef3]">
                  {lane.tasks.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#aab8ca]">
                {COLUMNS.map((column) => (
                  <span key={column.key} className="rounded-full border border-[#586678] bg-[#28313d] px-1.5 py-0.5">
                    {column.label}: {counts[column.key]}
                  </span>
                ))}
                <span className="ml-1 text-sm font-bold text-[#39e7ac]">{isExpanded ? "-" : "+"}</span>
              </div>
            </button>

            {isExpanded && (
              <div className="overflow-x-auto p-4">
                <div className="grid min-w-[960px] gap-4 xl:grid-cols-4">
                  {COLUMNS.map((column) => {
                    const columnTasks = lane.tasks
                      .filter((task) => task.workflow_status === column.key)
                      .sort((a, b) => a.board_order - b.board_order || a.id_task - b.id_task);
                    const dropKey = `${lane.id}:${column.key}`;
                    const canDropHere = draggedTask !== null;

                    return (
                      <section
                        key={column.key}
                        onDragOver={(event) => {
                          event.preventDefault();
                          if (canDropHere && !isSaving) {
                            setActiveDropTarget(dropKey);
                          }
                        }}
                        onDragLeave={() => {
                          if (activeDropTarget === dropKey) {
                            setActiveDropTarget(null);
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (canDropHere) {
                            void moveTask(column.key, lane.id);
                          }
                        }}
                        className={`rounded-xl border p-4 transition ${
                          activeDropTarget === dropKey
                            ? "border-[#39e7ac]/40 bg-[rgba(57,231,172,0.10)]"
                            : "border-[#7a8798] bg-[#1f2630]"
                        }`}
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${getColumnAccent(column.key)}`} />
                            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#edf3fb]">
                              {column.label}
                            </h3>
                          </div>
                          <span className="rounded border border-[#667386] bg-[#28313d] px-2 py-0.5 text-xs text-[#c3ceda]">
                            {columnTasks.length}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {columnTasks.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-[#667386] px-4 py-5 text-center text-xs text-[#93a0b1]">
                              {canDropHere ? "Drop tasks here" : "No tasks"}
                            </div>
                          ) : (
                            columnTasks.map((task) => (
                              <TaskCard
                                key={task.id_task}
                                task={task}
                                members={assignmentMembers}
                                onDragStart={(taskId) => {
                                  if (!isSaving) {
                                    setMoveError(null);
                                    setDraggedTaskId(taskId);
                                  }
                                }}
                                onDragEnd={() => {
                                  setDraggedTaskId(null);
                                  setActiveDropTarget(null);
                                }}
                              />
                            ))
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

