"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TaskActions from "@/app/components/tasks/TaskActions";
import TaskDetailsTrigger from "@/app/components/tasks/TaskDetailsTrigger";
import { apiFetch } from "@/app/lib/api";

type Task = {
  id_task: number;
  name: string;
  description: string | null;
  story_points: number | null;
  risk: number | null;
  priority: number | null;
  fk_teamid_team: number | null;
  can_delete?: boolean;
  delete_block_reason?: string | null;

  //jei situ neturiu skundziasi, nors jie useless cia
  multiplePeople: boolean;        // NEW
  assignees?: number[];   
};

type TeamBacklog = { team_id: number; team_name: string | null; tasks: Task[] };
type BacklogDragBoardProps = { 
  tasks: Task[]; 
  teams: TeamBacklog[]; 
  projectId: string;
  createTaskAction: (formData: FormData) => Promise<void>;
};

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

export default function BacklogDragBoard({ tasks, teams, projectId, createTaskAction }: BacklogDragBoardProps) {
  const router = useRouter();
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suppressNextRowClickRef = useRef(false);

  // Collapse state
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleCollapse = (sectionKey: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  };

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

  const handleDragStart = (e: React.DragEvent<HTMLElement>, taskId: number) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(taskId));
    suppressNextRowClickRef.current = true;
    setDraggedTaskId(taskId);
    setActiveDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setActiveDropTarget(null);
    window.setTimeout(() => {
      suppressNextRowClickRef.current = false;
    }, 0);
  };

  const handleRowClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!suppressNextRowClickRef.current) return;
    event.preventDefault();
    suppressNextRowClickRef.current = false;
  };

  const handleDragOverTarget = (e: React.DragEvent<HTMLDivElement>, targetKey: string) => {
    e.preventDefault();
    if (!isSaving) setActiveDropTarget(targetKey);
  };

  const handleDropTarget = async (e: React.DragEvent<HTMLDivElement>, teamId: number | null) => {
    e.preventDefault();
    const taskId = draggedTaskId ?? Number(e.dataTransfer.getData("text/plain"));
    if (!taskId) return;
    await assignTask(taskId, teamId);
  };

  const sectionClass = (targetKey: string) =>
    `rounded-xl border p-4 transition ${activeDropTarget === targetKey ? "border-[rgba(57,231,172,0.40)] bg-[rgba(46,230,166,0.08)]" : "border-[#7a8798] bg-[#1f2630]"}`;

  return (
    <>
      {error && <div className="mb-4 rounded-lg border border-[#ff4040]/20 bg-[#ff4040]/05 px-4 py-3 text-sm text-[#ff8080]">{error}</div>}

      <div className="mb-4">
        <h1 className="text-lg font-semibold text-[#edf3fb]">Backlog</h1>
      </div>

      {/* Sections */}
      {["unassigned", ...teams.map(t => `team-${t.team_id}`), "create-task"].map((sectionKey) => {
        if (sectionKey === "unassigned") {
          return (
            <div key={sectionKey} className="mb-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#edf3fb]">Unassigned Tasks</h2>
                <button
                  onClick={() => toggleCollapse(sectionKey)}
                  className="text-[#c3ceda] hover:text-[#edf3fb]"
                >
                  {collapsedSections.has(sectionKey) ? '▼' : '▲'}
                </button>
              </div>
              {!collapsedSections.has(sectionKey) && (
                <div className={`${sectionClass("unassigned")} p-6 rounded-xl space-y-2`} onDragOver={(e) => handleDragOverTarget(e, "unassigned")} onDragLeave={() => setActiveDropTarget(null)} onDrop={(e) => handleDropTarget(e, null)}>
                  {tasks.length === 0 && <p className="p-4 text-center text-xs text-[#93a0b1]">No unassigned tasks.</p>}
                  {tasks.map((task) => (
                    <TaskDetailsTrigger key={task.id_task} as="div" task={task} draggable={true} onClick={handleRowClick} onDragStart={(e) => handleDragStart(e, task.id_task)} onDragEnd={handleDragEnd} className="flex items-center justify-between rounded px-3 py-2 hover:bg-[#28313d] cursor-pointer">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-[#ffffff]">{task.name ?? "—"}</div>
                        <div className="text-xs text-[#c3ceda]">{task.description?.trim() || "—"}</div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#c3ceda]">
                        <span>{task.story_points ?? "—"}</span>
                        <span>{getRiskOrPriorityName(task.risk)}</span>
                        <span>{getRiskOrPriorityName(task.priority)}</span>
                        <TaskActions taskId={task.id_task} canDelete={task.can_delete} />
                      </div>
                    </TaskDetailsTrigger>
                  ))}
                </div>
              )}
            </div>
          );
        } else if (sectionKey === "create-task") {
          return (
            <div key={sectionKey} className="mb-6">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-[#edf3fb]">Create New Task</h2>
                  <button
                    onClick={() => toggleCollapse(sectionKey)}
                    className="text-[#c3ceda] hover:text-[#edf3fb]"
                  >
                    {collapsedSections.has(sectionKey) ? '▼' : '▲'}
                  </button>
                </div>
                {!collapsedSections.has(sectionKey) && (
                  <form action={createTaskAction} className="space-y-4 rounded-xl border border-[#7a8798] bg-[#1f2630] p-6">
                    <input type="hidden" name="fk_projectid_project" value={projectId} />
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Name</label>
                      <input name="name" required className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-3 text-sm text-[#ffffff] outline-none placeholder:text-[#93a0b1] focus:border-[rgba(57,231,172,0.40)]" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Description</label>
                      <textarea name="description" rows={3} className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-3 text-sm text-[#ffffff] outline-none placeholder:text-[#93a0b1] focus:border-[rgba(57,231,172,0.40)]" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Story Points</label>
                        <input type="number" step="0.1" name="story_points" className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-3 text-sm text-[#ffffff] outline-none focus:border-[rgba(57,231,172,0.40)]" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Risk</label>
                        <select name="risk" defaultValue="3" className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-3 text-sm text-[#ffffff] outline-none focus:border-[rgba(57,231,172,0.40)]">
                          {RiskAndPriority.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Priority</label>
                        <select name="priority" defaultValue="3" className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-3 text-sm text-[#ffffff] outline-none focus:border-[rgba(57,231,172,0.40)]">
                          {RiskAndPriority.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] px-5 py-2.5 text-sm font-bold text-[#39e7ac] transition hover:bg-[rgba(57,231,172,0.20)]">
                      Create Task
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        } else {
          const teamId = parseInt(sectionKey.split('-')[1]);
          const team = teams.find(t => t.team_id === teamId);
          if (!team) return null;
          const targetKey = getDropTargetKey(team.team_id);
          return (
            <div key={sectionKey} className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#ffffff]">{team.team_name ?? "Unnamed team"}</h3>
                <button
                  onClick={() => toggleCollapse(sectionKey)}
                  className="text-[#c3ceda] hover:text-[#edf3fb]"
                >
                  {collapsedSections.has(sectionKey) ? '▼' : '▲'}
                </button>
              </div>
              {!collapsedSections.has(sectionKey) && (
                <div className={`${sectionClass(targetKey)} p-6 rounded-xl space-y-2`} onDragOver={(e) => handleDragOverTarget(e, targetKey)} onDragLeave={() => setActiveDropTarget(null)} onDrop={(e) => handleDropTarget(e, team.team_id)}>
                  {team.tasks.length === 0 && <p className="p-4 text-center text-xs text-[#93a0b1]">No tasks assigned.</p>}
                  {team.tasks.map((task) => (
                    <TaskDetailsTrigger key={task.id_task} as="div" task={task} draggable={true} onClick={handleRowClick} onDragStart={(e) => handleDragStart(e, task.id_task)} onDragEnd={handleDragEnd} className="flex items-center justify-between rounded px-3 py-2 hover:bg-[#28313d] cursor-pointer">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-[#ffffff]">{task.name ?? "—"}</div>
                        <div className="text-xs text-[#c3ceda]">{task.description?.trim() || "—"}</div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#c3ceda]">
                        <span>{task.story_points ?? "—"}</span>
                        <span>{getRiskOrPriorityName(task.risk)}</span>
                        <span>{getRiskOrPriorityName(task.priority)}</span>
                        <TaskActions taskId={task.id_task} canDelete={task.can_delete} />
                      </div>
                    </TaskDetailsTrigger>
                  ))}
                </div>
              )}
            </div>
          );
        }
      })}
    </>
  );
}
