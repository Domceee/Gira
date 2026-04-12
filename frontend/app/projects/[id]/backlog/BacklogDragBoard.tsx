"use client";

import { useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import DescriptionButton from "@/app/components/DescriptionButton";
import AssignMenu from "@/app/components/tasks/AssignMenu";
import TaskActions from "@/app/components/tasks/TaskActions";
import { apiFetch } from "@/app/lib/api";

type Task = {
  id_task: number;
  name: string;
  description: string | null;
  story_points: number | null;
  risk: number | null;
  priority: number | null;
  fk_teamid_team: number | null;
};

type TeamBacklog = {
  team_id: number;
  team_name: string | null;
  tasks: Task[];
};

type BacklogDragBoardProps = {
  projectId: string;
  tasks: Task[];
  teams: TeamBacklog[];
};

const RiskAndPriority = [
  { id: 1, name: "Very low" },
  { id: 2, name: "Low" },
  { id: 3, name: "Medium" },
  { id: 4, name: "High" },
  { id: 5, name: "Very high" },
];

function getRiskOrPriorityName(value: number | null) {
  if (value === null) return "—";
  const item = RiskAndPriority.find((r) => r.id === value);
  return item ? item.name : "Unknown";
}

function getDropTargetKey(teamId: number | null) {
  return teamId === null ? "unassigned" : `team-${teamId}`;
}

export default function BacklogDragBoard({ projectId, tasks, teams }: BacklogDragBoardProps) {
  const router = useRouter();
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignTask = async (taskId: number, teamId: number | null) => {
    setError(null);
    setIsSaving(true);

    try {
      const targetParam = teamId === null ? "" : String(teamId);
      const response = await apiFetch(`/api/tasks/${taskId}/assign_team?team_id=${targetParam}`, {
        method: "PATCH",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to assign task to team");
      }

      setDraggedTaskId(null);
      setActiveDropTarget(null);
      router.refresh();
    } catch (err) {
      setError("Unable to move task. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragStart = (event: DragEvent<HTMLTableRowElement>, taskId: number) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(taskId));
    setDraggedTaskId(taskId);
    setActiveDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setActiveDropTarget(null);
  };

  const handleDragOverTarget = (event: DragEvent<HTMLDivElement>, targetKey: string) => {
    event.preventDefault();
    if (isSaving) return;
    setActiveDropTarget(targetKey);
  };

  const handleDropTarget = async (event: DragEvent<HTMLDivElement>, teamId: number | null) => {
    event.preventDefault();
    const taskId = draggedTaskId ?? Number(event.dataTransfer.getData("text/plain"));
    if (!taskId) return;
    await assignTask(taskId, teamId);
  };

  const sectionClass = (targetKey: string) =>
    `rounded-2xl border p-4 shadow-sm transition ${
      activeDropTarget === targetKey
        ? "border-[#b08968] bg-[#fff7ea] shadow-lg"
        : "border-[#d6bea5] bg-[#fffaf5]"
    }`;

  return (
    <>
      {error && (
        <div className="mb-6 rounded-xl border border-[#d4b08a] bg-[#fff7ef] px-4 py-3 text-sm text-[#7a3d2b]">
          {error}
        </div>
      )}

      <div
        className={sectionClass("unassigned")}
        onDragOver={(event) => handleDragOverTarget(event, "unassigned")}
        onDragLeave={() => setActiveDropTarget(null)}
        onDrop={(event) => handleDropTarget(event, null)}
      >
        <h2 className="mb-4 text-2xl font-bold text-[#5c3b28]">Unassigned Tasks</h2>

        <table className="w-full rounded-lg border-collapse">
          <thead className="bg-[#e8d6c3] text-[#4b2e1f]">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Description</th>
              <th className="p-3 text-left">Story Points</th>
              <th className="p-3 text-left">Risk</th>
              <th className="p-3 text-left">Priority</th>
              <th className="p-3 text-left">Assign</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-[#6f4e37]">
                  No unassigned tasks.
                </td>
              </tr>
            )}

            {tasks.map((task) => (
              <tr
                key={task.id_task}
                draggable
                onDragStart={(event) => handleDragStart(event, task.id_task)}
                onDragEnd={handleDragEnd}
                className="border border-[#d8c2a8] bg-white hover:bg-[#f7efe7]"
              >
                <td className="p-3 align-top">
                  <div className="max-w-[200px] max-h-[70px] overflow-hidden break-words">
                    {task.name ?? "—"}
                  </div>
                </td>
                <td className="p-3">
                  <DescriptionButton text={task.description} />
                </td>
                <td className="p-3">{task.story_points}</td>
                <td className="p-3">{getRiskOrPriorityName(task.risk)}</td>
                <td className="p-3">{getRiskOrPriorityName(task.priority)}</td>
                <td className="p-3">
                  <AssignMenu
                    taskId={task.id_task}
                    projectId={projectId}
                    selectedTeamId={task.fk_teamid_team}
                    teams={teams.map((team) => ({
                      team_id: team.team_id,
                      team_name: team.team_name,
                    }))}
                  />
                  <TaskActions
                    taskId={task.id_task}
                    projectId={projectId}
                    name={task.name}
                    description={task.description}
                    story_points={task.story_points}
                    risk={task.risk}
                    priority={task.priority}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-4 mt-10 text-2xl font-bold text-[#5c3b28]">Teams</h2>
      {teams.map((team) => {
        const targetKey = getDropTargetKey(team.team_id);
        return (
          <div
            key={team.team_id}
            className={`${sectionClass(targetKey)} mb-10`}
            onDragOver={(event) => handleDragOverTarget(event, targetKey)}
            onDragLeave={() => setActiveDropTarget(null)}
            onDrop={(event) => handleDropTarget(event, team.team_id)}
          >
            <h3 className="mb-2 text-xl font-semibold text-[#4b2e1f]">
              Team {team.team_name ?? "Unnamed team"}
            </h3>

            <table className="w-full rounded-lg border-collapse">
              <thead className="bg-[#e8d6c3] text-[#4b2e1f]">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-left">Story Points</th>
                  <th className="p-3 text-left">Risk</th>
                  <th className="p-3 text-left">Priority</th>
                  <th className="p-3 text-left">Assign</th>
                </tr>
              </thead>
              <tbody>
                {team.tasks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-[#6f4e37]">
                      No tasks assigned.
                    </td>
                  </tr>
                )}

                {team.tasks.map((task) => (
                  <tr
                    key={task.id_task}
                    draggable
                    onDragStart={(event) => handleDragStart(event, task.id_task)}
                    onDragEnd={handleDragEnd}
                    className="border border-[#d8c2a8] bg-white hover:bg-[#f7efe7]"
                  >
                    <td className="p-3 align-top">
                      <div className="max-w-[200px] max-h-[70px] overflow-hidden break-words">
                        {task.name ?? "—"}
                      </div>
                    </td>
                    <td className="p-3">
                      <DescriptionButton text={task.description} />
                    </td>
                    <td className="p-3">{task.story_points}</td>
                    <td className="p-3">{getRiskOrPriorityName(task.risk)}</td>
                    <td className="p-3">{getRiskOrPriorityName(task.priority)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <AssignMenu
                          taskId={task.id_task}
                          projectId={projectId}
                          selectedTeamId={task.fk_teamid_team}
                          teams={teams.map((optionTeam) => ({
                            team_id: optionTeam.team_id,
                            team_name: optionTeam.team_name,
                          }))}
                        />
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => assignTask(task.id_task, null)}
                          className="rounded-lg border border-[#c8a27a] bg-white px-3 py-2 text-sm text-[#5c3b28] hover:bg-[#f7efe7] disabled:opacity-50"
                        >
                          Unassign
                        </button>
                        <TaskActions
                          taskId={task.id_task}
                          projectId={projectId}
                          name={task.name}
                          description={task.description}
                          story_points={task.story_points}
                          risk={task.risk}
                          priority={task.priority}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}
