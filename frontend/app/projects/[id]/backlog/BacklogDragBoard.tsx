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

type TeamBacklog = { team_id: number; team_name: string | null; tasks: Task[] };
type BacklogDragBoardProps = { projectId: string; tasks: Task[]; teams: TeamBacklog[] };

const RiskAndPriority = [
  { id: 1, name: "Very low" }, { id: 2, name: "Low" }, { id: 3, name: "Medium" },
  { id: 4, name: "High" }, { id: 5, name: "Very high" },
];

function getRiskOrPriorityName(value: number | null) {
  if (value === null) return "—";
  return RiskAndPriority.find((r) => r.id === value)?.name ?? "Unknown";
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
      const response = await apiFetch(`/api/tasks/${taskId}/assign_team?team_id=${targetParam}`, { method: "PATCH" });
      if (!response.ok) throw new Error(await response.text() || "Failed to assign task");
      setDraggedTaskId(null);
      setActiveDropTarget(null);
      router.refresh();
    } catch { setError("Unable to move task. Please try again."); }
    finally { setIsSaving(false); }
  };

  const handleDragStart = (e: DragEvent<HTMLTableRowElement>, taskId: number) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(taskId));
    setDraggedTaskId(taskId);
    setActiveDropTarget(null);
  };

  const handleDragEnd = () => { setDraggedTaskId(null); setActiveDropTarget(null); };

  const handleDragOverTarget = (e: DragEvent<HTMLDivElement>, targetKey: string) => {
    e.preventDefault();
    if (!isSaving) setActiveDropTarget(targetKey);
  };

  const handleDropTarget = async (e: DragEvent<HTMLDivElement>, teamId: number | null) => {
    e.preventDefault();
    const taskId = draggedTaskId ?? Number(e.dataTransfer.getData("text/plain"));
    if (!taskId) return;
    await assignTask(taskId, teamId);
  };

  const sectionClass = (targetKey: string) =>
    `rounded-xl border p-4 transition ${activeDropTarget === targetKey ? "border-[rgba(57,231,172,0.40)] bg-[rgba(46,230,166,0.08)]" : "border-[#7a8798] bg-[#1f2630]"}`;

  const thClass = "p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#c3ceda]";
  const tdClass = "p-3 text-sm text-[#edf3fb]";
  const trClass = "border-b border-[#667386] hover:bg-[#28313d] transition-colors";

  return (
    <>
      {error && <div className="mb-4 rounded-lg border border-[#ff4040]/20 bg-[#ff4040]/05 px-4 py-3 text-sm text-[#ff8080]">{error}</div>}

      {/* Unassigned */}
      <div className={sectionClass("unassigned")} onDragOver={(e) => handleDragOverTarget(e, "unassigned")} onDragLeave={() => setActiveDropTarget(null)} onDrop={(e) => handleDropTarget(e, null)}>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#edf3fb]">Unassigned Tasks</h2>
        <table className="w-full border-collapse">
          <thead><tr>
            <th className={thClass}>Name</th><th className={thClass}>Description</th>
            <th className={thClass}>Pts</th><th className={thClass}>Risk</th>
            <th className={thClass}>Priority</th><th className={thClass}>Actions</th>
          </tr></thead>
          <tbody>
            {tasks.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-xs text-[#93a0b1]">No unassigned tasks.</td></tr>}
            {tasks.map((task) => (
              <tr key={task.id_task} draggable onDragStart={(e) => handleDragStart(e, task.id_task)} onDragEnd={handleDragEnd} className={trClass}>
                <td className={tdClass}><div className="max-w-[180px] max-h-[60px] overflow-hidden break-words text-[#ffffff]">{task.name ?? "—"}</div></td>
                <td className={tdClass}><DescriptionButton text={task.description} /></td>
                <td className={tdClass}>{task.story_points ?? "—"}</td>
                <td className={tdClass}>{getRiskOrPriorityName(task.risk)}</td>
                <td className={tdClass}>{getRiskOrPriorityName(task.priority)}</td>
                <td className={tdClass}>
                  <AssignMenu taskId={task.id_task} projectId={projectId} selectedTeamId={task.fk_teamid_team} teams={teams.map((t) => ({ team_id: t.team_id, team_name: t.team_name }))} />
                  <TaskActions taskId={task.id_task} projectId={projectId} name={task.name} description={task.description} story_points={task.story_points} risk={task.risk} priority={task.priority} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Teams */}
      <h2 className="mb-4 mt-8 text-sm font-bold uppercase tracking-widest text-[#edf3fb]">Teams</h2>
      {teams.map((team) => {
        const targetKey = getDropTargetKey(team.team_id);
        return (
          <div key={team.team_id} className={`${sectionClass(targetKey)} mb-6`} onDragOver={(e) => handleDragOverTarget(e, targetKey)} onDragLeave={() => setActiveDropTarget(null)} onDrop={(e) => handleDropTarget(e, team.team_id)}>
            <h3 className="mb-3 text-sm font-semibold text-[#ffffff]">{team.team_name ?? "Unnamed team"}</h3>
            <table className="w-full border-collapse">
              <thead><tr>
                <th className={thClass}>Name</th><th className={thClass}>Description</th>
                <th className={thClass}>Pts</th><th className={thClass}>Risk</th>
                <th className={thClass}>Priority</th><th className={thClass}>Actions</th>
              </tr></thead>
              <tbody>
                {team.tasks.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-xs text-[#93a0b1]">No tasks assigned.</td></tr>}
                {team.tasks.map((task) => (
                  <tr key={task.id_task} draggable onDragStart={(e) => handleDragStart(e, task.id_task)} onDragEnd={handleDragEnd} className={trClass}>
                    <td className={tdClass}><div className="max-w-[180px] max-h-[60px] overflow-hidden break-words text-[#ffffff]">{task.name ?? "—"}</div></td>
                    <td className={tdClass}><DescriptionButton text={task.description} /></td>
                    <td className={tdClass}>{task.story_points ?? "—"}</td>
                    <td className={tdClass}>{getRiskOrPriorityName(task.risk)}</td>
                    <td className={tdClass}>{getRiskOrPriorityName(task.priority)}</td>
                    <td className={tdClass}>
                      <div className="flex flex-wrap items-center gap-2">
                        <AssignMenu taskId={task.id_task} projectId={projectId} selectedTeamId={task.fk_teamid_team} teams={teams.map((t) => ({ team_id: t.team_id, team_name: t.team_name }))} />
                        <button type="button" disabled={isSaving} onClick={() => assignTask(task.id_task, null)}
                          className="rounded-lg border border-[#7a8798] px-2.5 py-1.5 text-xs text-[#edf3fb] transition hover:bg-[#323d4b] hover:text-[#ffffff] disabled:opacity-50">
                          Unassign
                        </button>
                        <TaskActions taskId={task.id_task} projectId={projectId} name={task.name} description={task.description} story_points={task.story_points} risk={task.risk} priority={task.priority} />
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
