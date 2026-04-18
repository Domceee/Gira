import DescriptionButton from "@/app/components/DescriptionButton";
import Link from "next/link";
import { CalendarX } from "lucide-react";
import { createSprint, assignTaskToSprint, closeSprint } from "./actions";
import TaskStatusForm from "./TaskStatusForm";
import CreateSprintForm from "./create-sprint-form";
import { getRiskOrPriorityName } from "@/app/lib/riskPriority";
import TaskActions from "@/app/components/tasks/TaskActions";
import AssignMemberForm from "./AssignMemberForm";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Task = {
  id_task: number;
  name: string;
  description: string | null;
  story_points: number | null;
  risk: number | null;
  priority: number | null;
  fk_sprintid_sprint: number | null;
  fk_team_memberid_team_member: number | null;
  workflow_status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
};

type TeamMember = {
  id_team_member: number;
  role_in_team: string | null;
  effectiveness: number | null;
  user: { id_user: number; name: string; email: string; picture: string | null };
};

type Sprint = {
  id_sprint: number;
  start_date: string;
  end_date: string;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
  tasks: Task[];
};

type TeamBacklog = {
  team_id: number;
  team_name: string | null;
  tasks: Task[];
  team_members: TeamMember[];
};

function ChartIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-7" />
    </svg>
  );
}

function formatDate(d: string) { return d.split("T")[0]; }

const thClass = "p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#444] bg-[#111]";
const tdClass = "p-3 text-sm text-[#888]";
const trClass = "border-b border-[#1a1a1a] hover:bg-[#111] transition-colors";

export default function TeamViewContent({ team, projectId, teamId, activeSprints, plannedSprints, endedSprints }: {
  team: TeamBacklog;
  projectId: string;
  teamId: string | number;
  activeSprints: Sprint[];
  plannedSprints: Sprint[];
  endedSprints: Sprint[];
}) {
  const backlogTasks = team.tasks.filter((t) => t.fk_sprintid_sprint === null);

  return (
    <div className="space-y-8">
      {/* Backlog */}
      <div className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#888]">Team Backlog</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr>
              <th className={thClass}>Name</th><th className={thClass}>Desc</th>
              <th className={thClass}>Pts</th><th className={thClass}>Risk</th>
              <th className={thClass}>Priority</th><th className={thClass}>Sprint</th>
              <th className={thClass}>Member</th><th className={thClass}></th>
            </tr></thead>
            <tbody>
              {backlogTasks.length === 0
                ? <tr><td colSpan={8} className="p-4 text-center text-xs text-[#333]">No tasks in backlog.</td></tr>
                : backlogTasks.map((task) => (
                  <tr key={task.id_task} className={trClass}>
                    <td className={tdClass}><div className="max-w-[180px] max-h-[60px] overflow-hidden break-words text-[#f0f0f0]">{task.name ?? "—"}</div></td>
                    <td className={tdClass}><DescriptionButton text={task.description} /></td>
                    <td className={tdClass}>{task.story_points ?? "—"}</td>
                    <td className={tdClass}>{getRiskOrPriorityName(task.risk)}</td>
                    <td className={tdClass}>{getRiskOrPriorityName(task.priority)}</td>
                    <td className={tdClass}>
                      <form action={assignTaskToSprint} className="flex gap-2 items-center">
                        <input type="hidden" name="task_id" value={task.id_task} />
                        <input type="hidden" name="team_id" value={teamId} />
                        <input type="hidden" name="project_id" value={projectId} />
                        <select name="sprint_id" defaultValue={task.fk_sprintid_sprint ?? "null"}
                          className="rounded-lg border border-[#1e1e1e] bg-[#111] px-2 py-1.5 text-xs text-[#f0f0f0] outline-none">
                          <option value="null">Backlog</option>
                          {plannedSprints.map((s) => <option key={s.id_sprint} value={s.id_sprint}>Planned Sprint {s.id_sprint}</option>)}
                          {activeSprints.map((s) => <option key={s.id_sprint} value={s.id_sprint}>Active Sprint {s.id_sprint}</option>)}
                        </select>
                        <button type="submit" className="rounded-lg border border-[rgba(57,255,20,0.3)] bg-[rgba(57,255,20,0.08)] px-2.5 py-1.5 text-xs text-[#39ff14] hover:bg-[rgba(57,255,20,0.14)]">Save</button>
                      </form>
                    </td>
                    <td className={tdClass}><AssignMemberForm taskId={task.id_task} teamId={String(teamId)} projectId={projectId} teamMembers={team.team_members} defaultValue={task.fk_team_memberid_team_member} /></td>
                    <td className={tdClass}><TaskActions taskId={task.id_task} projectId={projectId} name={task.name} description={task.description} story_points={task.story_points} risk={task.risk} priority={task.priority} /></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Sprints */}
      <div>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#39ff14]">Active Sprints</h2>
        {activeSprints.length === 0 && (
          <div className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-4 text-sm text-[#444]">No active sprints yet.</div>
        )}
        {activeSprints.map((sprint) => (
          <div key={sprint.id_sprint} className="mb-6 rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-semibold text-[#f0f0f0]">Sprint {sprint.id_sprint} <span className="text-[#444] text-sm">({formatDate(sprint.start_date)} → {formatDate(sprint.end_date)})</span></h3>
              <div className="flex flex-wrap gap-2">
                <Link href={`/projects/${projectId}/team/${teamId}/sprints/${sprint.id_sprint}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#1e1e1e] bg-[#111] px-3 py-2 text-xs font-semibold text-[#ccc] transition hover:bg-[#161616] hover:text-[#f0f0f0]">
                  <ChartIcon />Sprint Stats
                </Link>
                <form action={closeSprint}>
                  <input type="hidden" name="sprint_id" value={sprint.id_sprint} />
                  <input type="hidden" name="team_id" value={teamId} />
                  <input type="hidden" name="project_id" value={projectId} />
                  <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg border border-[#ff4040]/20 bg-[#ff4040]/05 px-3 py-2 text-xs font-semibold text-[#ff8080] transition hover:bg-[#ff4040]/10">
                    <CalendarX className="h-3.5 w-3.5" />Close Sprint
                  </button>
                </form>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead><tr>
                  <th className={thClass}>Name</th><th className={thClass}>Desc</th>
                  <th className={thClass}>Pts</th><th className={thClass}>Risk</th>
                  <th className={thClass}>Priority</th><th className={thClass}>Member</th>
                  <th className={thClass}>Status</th><th className={thClass}>Sprint</th>
                </tr></thead>
                <tbody>
                  {sprint.tasks.length === 0
                    ? <tr><td colSpan={8} className="p-4 text-center text-xs text-[#333]">No tasks in this sprint.</td></tr>
                    : [...sprint.tasks].sort((a, b) => a.id_task - b.id_task).map((task) => (
                      <tr key={task.id_task} className={trClass}>
                        <td className={tdClass}><div className="max-w-[180px] max-h-[60px] overflow-hidden break-words text-[#f0f0f0]">{task.name ?? "—"}</div></td>
                        <td className={tdClass}><DescriptionButton text={task.description} /></td>
                        <td className={tdClass}>{task.story_points ?? "—"}</td>
                        <td className={tdClass}>{getRiskOrPriorityName(task.risk)}</td>
                        <td className={tdClass}>{getRiskOrPriorityName(task.priority)}</td>
                        <td className={tdClass}><AssignMemberForm taskId={task.id_task} teamId={String(teamId)} projectId={projectId} teamMembers={team.team_members} defaultValue={task.fk_team_memberid_team_member} /></td>
                        <td className={tdClass}><TaskStatusForm key={task.id_task + "-" + task.workflow_status} taskId={task.id_task} teamId={String(teamId)} projectId={projectId} defaultValue={task.workflow_status} /></td>
                        <td className={tdClass}>
                          <form action={assignTaskToSprint} className="flex gap-2 items-center">
                            <input type="hidden" name="task_id" value={task.id_task} />
                            <input type="hidden" name="team_id" value={teamId} />
                            <input type="hidden" name="project_id" value={projectId} />
                            <select name="sprint_id" defaultValue={task.fk_sprintid_sprint ?? sprint.id_sprint}
                              className="rounded-lg border border-[#1e1e1e] bg-[#111] px-2 py-1.5 text-xs text-[#f0f0f0] outline-none">
                              <option value="null">Move to Backlog</option>
                              {plannedSprints.map((s) => <option key={s.id_sprint} value={s.id_sprint}>Planned Sprint {s.id_sprint}</option>)}
                              {activeSprints.map((s) => <option key={s.id_sprint} value={s.id_sprint}>Active Sprint {s.id_sprint}</option>)}
                            </select>
                            <button type="submit" className="rounded-lg border border-[rgba(57,255,20,0.3)] bg-[rgba(57,255,20,0.08)] px-2.5 py-1.5 text-xs text-[#39ff14] hover:bg-[rgba(57,255,20,0.14)]">Save</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Planned Sprints */}
      <div>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#888]">Planned Sprints</h2>
        {plannedSprints.length === 0 && (
          <div className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-4 text-sm text-[#444]">No planned sprints yet.</div>
        )}
        {plannedSprints.map((sprint) => (
          <div key={sprint.id_sprint} className="mb-6 rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-semibold text-[#888]">Sprint {sprint.id_sprint} <span className="text-[#444] text-sm">({formatDate(sprint.start_date)} → {formatDate(sprint.end_date)})</span></h3>
              <Link href={`/projects/${projectId}/team/${teamId}/sprints/${sprint.id_sprint}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#1e1e1e] bg-[#111] px-3 py-2 text-xs font-semibold text-[#ccc] transition hover:bg-[#161616]">
                <ChartIcon />Sprint Stats
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead><tr>
                  <th className={thClass}>Name</th><th className={thClass}>Desc</th>
                  <th className={thClass}>Pts</th><th className={thClass}>Risk</th>
                  <th className={thClass}>Priority</th><th className={thClass}>Member</th>
                  <th className={thClass}>Status</th><th className={thClass}>Sprint</th>
                </tr></thead>
                <tbody>
                  {sprint.tasks.length === 0
                    ? <tr><td colSpan={8} className="p-4 text-center text-xs text-[#333]">No tasks in this sprint.</td></tr>
                    : [...sprint.tasks].sort((a, b) => a.id_task - b.id_task).map((task) => (
                      <tr key={task.id_task} className={trClass}>
                        <td className={tdClass}><div className="max-w-[180px] max-h-[60px] overflow-hidden break-words text-[#f0f0f0]">{task.name ?? "—"}</div></td>
                        <td className={tdClass}><DescriptionButton text={task.description} /></td>
                        <td className={tdClass}>{task.story_points ?? "—"}</td>
                        <td className={tdClass}>{getRiskOrPriorityName(task.risk)}</td>
                        <td className={tdClass}>{getRiskOrPriorityName(task.priority)}</td>
                        <td className={tdClass}><AssignMemberForm taskId={task.id_task} teamId={String(teamId)} projectId={projectId} teamMembers={team.team_members} defaultValue={task.fk_team_memberid_team_member} /></td>
                        <td className={tdClass}><TaskStatusForm key={task.id_task + "-" + task.workflow_status} taskId={task.id_task} teamId={String(teamId)} projectId={projectId} defaultValue={task.workflow_status} /></td>
                        <td className={tdClass}>
                          <form action={assignTaskToSprint} className="flex gap-2 items-center">
                            <input type="hidden" name="task_id" value={task.id_task} />
                            <input type="hidden" name="team_id" value={teamId} />
                            <input type="hidden" name="project_id" value={projectId} />
                            <select name="sprint_id" defaultValue={task.fk_sprintid_sprint ?? sprint.id_sprint}
                              className="rounded-lg border border-[#1e1e1e] bg-[#111] px-2 py-1.5 text-xs text-[#f0f0f0] outline-none">
                              <option value="null">Move to Backlog</option>
                              {plannedSprints.map((s) => <option key={s.id_sprint} value={s.id_sprint}>Planned Sprint {s.id_sprint}</option>)}
                              {activeSprints.map((s) => <option key={s.id_sprint} value={s.id_sprint}>Active Sprint {s.id_sprint}</option>)}
                            </select>
                            <button type="submit" className="rounded-lg border border-[rgba(57,255,20,0.3)] bg-[rgba(57,255,20,0.08)] px-2.5 py-1.5 text-xs text-[#39ff14] hover:bg-[rgba(57,255,20,0.14)]">Save</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Create Sprint */}
      <div>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#888]">Create New Sprint</h3>
        <CreateSprintForm action={createSprint} teamId={String(teamId)} projectId={String(projectId)} existingSprints={[...activeSprints, ...plannedSprints, ...endedSprints]} />
      </div>

      {/* Ended Sprints */}
      <div>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#444]">Ended Sprints</h2>
        {endedSprints.length === 0 && (
          <div className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-4 text-sm text-[#444]">No completed sprints yet.</div>
        )}
        {endedSprints.map((sprint) => (
          <div key={sprint.id_sprint} className="mb-6 rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-6 opacity-70">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-semibold text-[#444]">Sprint {sprint.id_sprint} <span className="text-xs">({formatDate(sprint.start_date)} → {formatDate(sprint.end_date)})</span></h3>
              <Link href={`/projects/${projectId}/team/${teamId}/sprints/${sprint.id_sprint}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#1a1a1a] bg-[#111] px-3 py-2 text-xs text-[#555] transition hover:text-[#f0f0f0]">
                <ChartIcon />Sprint Stats
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead><tr>
                  <th className={thClass}>Name</th><th className={thClass}>Desc</th>
                  <th className={thClass}>Pts</th><th className={thClass}>Risk</th>
                  <th className={thClass}>Priority</th><th className={thClass}>Member</th>
                </tr></thead>
                <tbody>
                  {sprint.tasks.length === 0
                    ? <tr><td colSpan={6} className="p-4 text-center text-xs text-[#333]">No tasks.</td></tr>
                    : sprint.tasks.map((task) => {
                      const member = team.team_members.find((m) => m.id_team_member === task.fk_team_memberid_team_member);
                      return (
                        <tr key={task.id_task} className={trClass}>
                          <td className={tdClass}><div className="max-w-[180px] max-h-[60px] overflow-hidden break-words">{task.name ?? "—"}</div></td>
                          <td className={tdClass}><DescriptionButton text={task.description} /></td>
                          <td className={tdClass}>{task.story_points ?? "—"}</td>
                          <td className={tdClass}>{getRiskOrPriorityName(task.risk)}</td>
                          <td className={tdClass}>{getRiskOrPriorityName(task.priority)}</td>
                          <td className={tdClass}>{member ? member.user.name : "Unassigned"}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
