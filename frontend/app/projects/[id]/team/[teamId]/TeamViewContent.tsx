"use client";
import Link from "next/link";
import { CalendarX } from "lucide-react";
import { createSprint, assignTaskToSprint, closeSprint, updateSprint, deleteSprintAction} from "./actions";
import TaskStatusForm from "./TaskStatusForm";
import CreateSprintForm from "./create-sprint-form";
import { getRiskOrPriorityName } from "@/app/lib/riskPriority";
import TaskActions from "@/app/components/tasks/TaskActions";
import TaskDetailsTrigger from "@/app/components/tasks/TaskDetailsTrigger";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import MemberSelector from "./MemberSelector";





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
  can_delete?: boolean;
  delete_block_reason?: string | null;
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

const thClass = "p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#c3ceda] bg-[#28313d]";
const tdClass = "p-3 text-sm text-[#edf3fb]";
const trClass = "cursor-pointer border-b border-[#667386] hover:bg-[#28313d] transition-colors";
const taskTableClass = "w-full table-fixed border-collapse";


export default function TeamViewContent({ team, projectId, teamId, activeSprints, plannedSprints, endedSprints }: {
  team: TeamBacklog;
  projectId: string;
  teamId: string | number;
  activeSprints: Sprint[];
  plannedSprints: Sprint[];
  endedSprints: Sprint[];
}) {
  const backlogTasks = team.tasks.filter((t) => t.fk_sprintid_sprint === null);
  const taskModalMembers = team.team_members.map((member) => ({
    id_team_member: member.id_team_member,
    name: member.user.name,
  }));
  const taskNameClass = "max-w-[180px] max-h-[60px] overflow-hidden break-words text-[#ffffff]";
  const descriptionClass = "max-w-[260px] truncate text-[#c3ceda]";
  const router = useRouter();
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [sprintError, setSprintError] = useState<string | null>(null);
  function closeSprintModal() {
  setEditingSprint(null);
  setSprintError(null);   // clear error when closing
} async function handleSprintUpdate(formData: FormData) {
    setSprintError(null); // clear previous errors

    try {
      await updateSprint(formData);   // server action
      closeSprintModal();        // close modal
      setSprintError(null);
      router.refresh();               // refresh UI
    } catch (err: any) {
      try {
        const parsed = JSON.parse(err.message);
        setSprintError(parsed.detail || "Failed to update sprint");
      } catch {
        setSprintError("Failed to update sprint");
      }
    }
  }
async function handleDeleteSprint(formData: FormData): Promise<void> {
  try {
    await deleteSprintAction(formData); // ignore returned boolean
    closeSprintModal();
    router.refresh();
  } catch (err) {
    console.error(err);
  }
}


const [openMember, setOpenMember] = useState<number | null>(null);
const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
const avatarRef = useRef<HTMLButtonElement | null>(null);

useEffect(() => {
  function handleClick(e: MouseEvent) {
    if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
      setOpenMember(null);
    }
  }
  document.addEventListener("mousedown", handleClick);
  return () => document.removeEventListener("mousedown", handleClick);
}, []);



  const backlogColumnGroup = (
    <colgroup>
      <col className="w-[18%]" />
      <col className="w-[24%]" />
      <col className="w-[7%]" />
      <col className="w-[11%]" />
      <col className="w-[11%]" />
      <col className="w-[21%]" />
      <col className="w-[8%]" />
    </colgroup>
  );
  const sprintColumnGroup = (
    <colgroup>
      <col className="w-[18%]" />
      <col className="w-[7%]" />
      <col className="w-[10%]" />
      <col className="w-[10%]" />
      <col className="w-[21%]" />
      <col className="w-[24%]" />
      <col className="w-[10%]" />
    </colgroup>
  );
  const endedSprintColumnGroup = (
    <colgroup>
      <col className="w-[20%]" />
      <col className="w-[28%]" />
      <col className="w-[8%]" />
      <col className="w-[12%]" />
      <col className="w-[12%]" />
      <col className="w-[20%]" />
    </colgroup>
  );

   return (
    <div className="space-y-8">
      {/* Backlog */}
      <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#edf3fb]">Team Backlog</h2>
        <div className="overflow-x-auto">
          <table className={taskTableClass}>
            {backlogColumnGroup}
            <thead><tr>
              <th className={thClass}>Name</th><th className={thClass}>Desc</th>
              <th className={thClass}>Pts</th><th className={thClass}>Risk</th>
              <th className={thClass}>Priority</th><th className={thClass}>Sprint</th>
              <th className={`${thClass} text-right`}></th>
            </tr></thead>
            <tbody>
              {backlogTasks.length === 0
                ? <tr><td colSpan={7} className="p-4 text-center text-xs text-[#93a0b1]">No tasks in backlog.</td></tr>
                : backlogTasks.map((task) => (
                  <TaskDetailsTrigger                       key={`${task.id_task}-${task.fk_team_memberid_team_member}`}                       task={task}                       members={taskModalMembers}                       className={trClass}
                    >

                    <td className={tdClass}><div className={taskNameClass}>{task.name ?? "—"}</div></td>
                    <td className={tdClass}><div className={descriptionClass} title={task.description?.trim() || undefined}>{task.description?.trim() || "—"}</div></td>
                    <td className={tdClass}>{task.story_points ?? "—"}</td>
                    <td className={tdClass}>{getRiskOrPriorityName(task.risk)}</td>
                    <td className={tdClass}>{getRiskOrPriorityName(task.priority)}</td>
                    <td className={tdClass}>
                      <form action={assignTaskToSprint} className="flex gap-2 items-center">
                        <input type="hidden" name="task_id" value={task.id_task} />
                        <input type="hidden" name="team_id" value={teamId} />
                        <input type="hidden" name="project_id" value={projectId} />
                        <select name="sprint_id" defaultValue={task.fk_sprintid_sprint ?? "null"}
                          className="rounded-lg border border-[#7a8798] bg-[#28313d] px-2 py-1.5 text-xs text-[#ffffff] outline-none">
                          <option value="null">Backlog</option>
                          {plannedSprints.map((s) => <option key={s.id_sprint} value={s.id_sprint}>Planned Sprint {s.id_sprint}</option>)}
                          {activeSprints.map((s) => <option key={s.id_sprint} value={s.id_sprint}>Active Sprint {s.id_sprint}</option>)}
                        </select>
                        <button type="submit" className="rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] px-2.5 py-1.5 text-xs text-[#39e7ac] hover:bg-[rgba(57,231,172,0.20)]">Save</button>
                      </form>
                    </td>
                    <td className={`${tdClass} text-right`}><TaskActions taskId={task.id_task} canDelete={task.can_delete} /></td>
                  </TaskDetailsTrigger>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Sprints */}
<div>
  <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#39e7ac]">
    Active Sprints
  </h2>

  {activeSprints.length === 0 && (
    <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-4 text-sm text-[#c3ceda]">
      No active sprints yet.
    </div>
  )}

  {activeSprints.map((sprint) => (
    <div
      key={sprint.id_sprint}
      className="mb-6 rounded-xl border border-[#7a8798] bg-[#1f2630] p-6"
    >
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-[#ffffff]">
          Sprint {sprint.id_sprint}{" "}
          <span className="text-[#c3ceda] text-sm">
            ({formatDate(sprint.start_date)} → {formatDate(sprint.end_date)})
          </span>
        </h3>

        <div className="flex flex-wrap gap-2">
             <button
            type="button"
            onClick={() => setEditingSprint(sprint)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-2 text-xs font-semibold text-[#f7faff] transition hover:bg-[#323d4b]"
          >
            Edit
          </button>

          {/* Sprint Stats */}
          <Link
            href={`/projects/${projectId}/team/${teamId}/sprints/${sprint.id_sprint}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-2 text-xs font-semibold text-[#f7faff] transition hover:bg-[#323d4b]"
          >
            <ChartIcon />
            Sprint Stats
          </Link>

          {/* Close Sprint */}
          <form action={closeSprint}>
            <input type="hidden" name="sprint_id" value={sprint.id_sprint} />
            <input type="hidden" name="team_id" value={teamId} />
            <input type="hidden" name="project_id" value={projectId} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#ff4040]/20 bg-[#ff4040]/05 px-3 py-2 text-xs font-semibold text-[#ff8080] transition hover:bg-[#ff4040]/10"
            >
              <CalendarX className="h-3.5 w-3.5" />
              Close Sprint
            </button>
          </form>
        </div>
      </div>

      {/* Sprint Tasks Table */}
      <div className="overflow-x-auto">
        <table className={taskTableClass}>
          {sprintColumnGroup}
          <thead>
            <tr>
              <th className={thClass}>Name</th>
              <th className={thClass}>Pts</th>
              <th className={thClass}>Risk</th>
              <th className={thClass}>Priority</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Sprint</th>
              <th className={thClass}>Member</th>
            </tr>
          </thead>

          <tbody>
            {sprint.tasks.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-4 text-center text-xs text-[#93a0b1]"
                >
                  No tasks in this sprint.
                </td>
              </tr>
            ) : (
              [...sprint.tasks]
                .sort((a, b) => a.id_task - b.id_task)
                .map((task) => (
                  <TaskDetailsTrigger
                    key={`${task.id_task}-${task.fk_team_memberid_team_member}`}
                    task={task}
                    members={taskModalMembers}
                    className={trClass}
                  >
                    <td className={tdClass}>
                      <div className={taskNameClass}>{task.name ?? "—"}</div>
                    </td>
                    <td className={tdClass}>{task.story_points ?? "—"}</td>
                    <td className={tdClass}>
                      {getRiskOrPriorityName(task.risk)}
                    </td>
                    <td className={tdClass}>
                      {getRiskOrPriorityName(task.priority)}
                    </td>
                    <td className={tdClass}>
                      <TaskStatusForm
                        key={task.id_task + "-" + task.workflow_status}
                        taskId={task.id_task}
                        teamId={String(teamId)}
                        projectId={projectId}
                        defaultValue={task.workflow_status}
                      />
                    </td>

                    {/* Sprint Selector */}
                    <td className={tdClass}>
                      <form
                        action={assignTaskToSprint}
                        className="flex gap-2 items-center"
                      >
                        <input
                          type="hidden"
                          name="task_id"
                          value={task.id_task}
                        />
                        <input type="hidden" name="team_id" value={teamId} />
                        <input
                          type="hidden"
                          name="project_id"
                          value={projectId}
                        />

                        <select
                          name="sprint_id"
                          defaultValue={
                            task.fk_sprintid_sprint ?? sprint.id_sprint
                          }
                          className="rounded-lg border border-[#7a8798] bg-[#28313d] px-2 py-1.5 text-xs text-[#ffffff]"
                        >
                          <option value="null">Move to Backlog</option>
                          {plannedSprints.map((s) => (
                            <option key={s.id_sprint} value={s.id_sprint}>
                              Planned Sprint {s.id_sprint}
                            </option>
                          ))}
                          {activeSprints.map((s) => (
                            <option key={s.id_sprint} value={s.id_sprint}>
                              Active Sprint {s.id_sprint}
                            </option>
                          ))}
                        </select>

                        <button
                          type="submit"
                          className="rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] px-2.5 py-1.5 text-xs text-[#39e7ac] hover:bg-[rgba(57,231,172,0.20)]"
                        >
                          Save
                        </button>
                      </form>
                    </td>

<td className={tdClass}>
  {(() => {
    const assigned = team.team_members.find(
      (m) => m.id_team_member === task.fk_team_memberid_team_member
    );

    if (!assigned) {
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7a8798] text-[11px] font-semibold text-[#39e7ac]">
          ?
        </div>
      );
    }

    return assigned.user.picture ? (
      <img
        src={`data:image/jpeg;base64,${assigned.user.picture}`}
        className="h-7 w-7 rounded-full object-cover border border-[#7b8798]"
      />
    ) : (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7a8798] text-[11px] font-semibold text-[#39e7ac]">
        {assigned.user.name[0].toUpperCase()}
      </div>
    );
  })()}
</td>







                  </TaskDetailsTrigger>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  ))}

  {/*  EDIT SPRINT MODAL */}
  {editingSprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[420px] rounded-xl border border-[#7a8798] bg-[#1f2630] p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-bold text-white">
          Edit Sprint {editingSprint.id_sprint}
        </h3>

        {sprintError && (
        <div className="mb-3 rounded-lg border border-red-500 bg-red-900/40 text-red-300 px-3 py-2 text-sm">
          {sprintError}
        </div>
      )}

        <form action={handleSprintUpdate} className="space-y-4">
          <input
            type="hidden"
            name="sprint_id"
            value={editingSprint.id_sprint}
          />
          <input type="hidden" name="team_id" value={teamId} />
          <input type="hidden" name="project_id" value={projectId} />





          <div>
            <label className="block text-xs text-[#c3ceda] mb-1">
              End Date
            </label>
            <input
              type="date"
              name="end_date"
              defaultValue={editingSprint.end_date.split("T")[0]}
              className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeSprintModal}
              className="rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-2 text-sm text-white hover:bg-[#323d4b]"
            >
              Cancel
            </button>
              <button
                type="submit"
                formAction={handleDeleteSprint}
                className="rounded-lg border border-red-500 bg-red-900/40 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-900/60"
              >
                Delete Sprint
              </button>


            <button
              type="submit"
              className="rounded-lg border border-[#39e7ac]/40 bg-[#39e7ac]/20 px-4 py-2 text-sm font-semibold text-[#39e7ac] hover:bg-[#39e7ac]/30"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )}
</div>


      {/* Planned Sprints */}
      <div>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#edf3fb]">Planned Sprints</h2>
        {plannedSprints.length === 0 && (
          <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-4 text-sm text-[#c3ceda]">No planned sprints yet.</div>
        )}
        {plannedSprints.map((sprint) => (
          <div key={sprint.id_sprint} className="mb-6 rounded-xl border border-[#7a8798] bg-[#1f2630] p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-semibold text-[#edf3fb]">Sprint {sprint.id_sprint} <span className="text-[#c3ceda] text-sm">({formatDate(sprint.start_date)} → {formatDate(sprint.end_date)})</span></h3>
            <button
            type="button"
            onClick={() => setEditingSprint(sprint)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-2 text-xs font-semibold text-[#f7faff] transition hover:bg-[#323d4b]"
          >
            Edit
          </button>
              <Link href={`/projects/${projectId}/team/${teamId}/sprints/${sprint.id_sprint}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-2 text-xs font-semibold text-[#f7faff] transition hover:bg-[#323d4b]">
                <ChartIcon />Sprint Stats
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className={taskTableClass}>
                {sprintColumnGroup}
                <thead><tr>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Pts</th><th className={thClass}>Risk</th>
                  <th className={thClass}>Priority</th><th className={thClass}>Status</th>
                  <th className={thClass}>Sprint</th><th className={thClass}>Member</th>
                </tr></thead>
                <tbody>
                  {sprint.tasks.length === 0
                    ? <tr><td colSpan={7} className="p-4 text-center text-xs text-[#93a0b1]">No tasks in this sprint.</td></tr>
                    : [...sprint.tasks].sort((a, b) => a.id_task - b.id_task).map((task) => (
                      <TaskDetailsTrigger                           key={`${task.id_task}-${task.fk_team_memberid_team_member}`}                           task={task}                           members={taskModalMembers}                           className={trClass}
                        >

                        <td className={tdClass}><div className={taskNameClass}>{task.name ?? "—"}</div></td>
                        <td className={tdClass}>{task.story_points ?? "—"}</td>
                        <td className={tdClass}>{getRiskOrPriorityName(task.risk)}</td>
                        <td className={tdClass}>{getRiskOrPriorityName(task.priority)}</td>
                        <td className={tdClass}><TaskStatusForm key={task.id_task + "-" + task.workflow_status} taskId={task.id_task} teamId={String(teamId)} projectId={projectId} defaultValue={task.workflow_status} /></td>
                        <td className={tdClass}>
                          <form action={assignTaskToSprint} className="flex gap-2 items-center">
                            <input type="hidden" name="task_id" value={task.id_task} />
                            <input type="hidden" name="team_id" value={teamId} />
                            <input type="hidden" name="project_id" value={projectId} />
                            <select name="sprint_id" defaultValue={task.fk_sprintid_sprint ?? sprint.id_sprint}
                              className="rounded-lg border border-[#7a8798] bg-[#28313d] px-2 py-1.5 text-xs text-[#ffffff] outline-none">
                              <option value="null">Move to Backlog</option>
                              {plannedSprints.map((s) => <option key={s.id_sprint} value={s.id_sprint}>Planned Sprint {s.id_sprint}</option>)}
                              {activeSprints.map((s) => <option key={s.id_sprint} value={s.id_sprint}>Active Sprint {s.id_sprint}</option>)}
                            </select>
                            <button type="submit" className="rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] px-2.5 py-1.5 text-xs text-[#39e7ac] hover:bg-[rgba(57,231,172,0.20)]">Save</button>
                          </form>
                        </td>
                        <td className={tdClass}>
  {(() => {
    const assigned = team.team_members.find(
      (m) => m.id_team_member === task.fk_team_memberid_team_member
    );

    if (!assigned) {
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7a8798] text-[11px] font-semibold text-[#39e7ac]">
          ?
        </div>
      );
    }

    return assigned.user.picture ? (
      <img
        src={`data:image/jpeg;base64,${assigned.user.picture}`}
        className="h-7 w-7 rounded-full object-cover border border-[#7b8798]"
      />
    ) : (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7a8798] text-[11px] font-semibold text-[#39e7ac]">
        {assigned.user.name[0].toUpperCase()}
      </div>
    );
  })()}
</td>


                      </TaskDetailsTrigger>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {editingSprint && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[420px] rounded-xl border border-[#7a8798] bg-[#1f2630] p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-bold text-white">
          Edit Sprint {editingSprint.id_sprint}
        </h3>
          {sprintError && (
        <div className="mb-3 rounded-lg border border-red-500 bg-red-900/40 text-red-300 px-3 py-2 text-sm">
          {sprintError}
        </div>
        )}
        <form action={handleSprintUpdate} className="space-y-4">
          <input
            type="hidden"
            name="sprint_id"
            value={editingSprint.id_sprint}
          />
          <input type="hidden" name="team_id" value={teamId} />
          <input type="hidden" name="project_id" value={projectId} />

        <div>
            <label className="block text-xs text-[#c3ceda] mb-1">
              Start Date
            </label>
            <input
              type="date"
              name="start_date"
              defaultValue={editingSprint.start_date.split("T")[0]}
              className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-2 text-sm text-white"
            />
          </div>



          <div>
            <label className="block text-xs text-[#c3ceda] mb-1">
              End Date
            </label>
            <input
              type="date"
              name="end_date"
              defaultValue={editingSprint.end_date.split("T")[0]}
              className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeSprintModal}
              className="rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-2 text-sm text-white hover:bg-[#323d4b]"
            >
              Cancel
            </button>

              <button
                type="submit"
                formAction={handleDeleteSprint}
                className="rounded-lg border border-red-500 bg-red-900/40 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-900/60"
              >
                Delete Sprint
              </button>


            <button
              type="submit"
              className="rounded-lg border border-[#39e7ac]/40 bg-[#39e7ac]/20 px-4 py-2 text-sm font-semibold text-[#39e7ac] hover:bg-[#39e7ac]/30"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )}
      </div>

      {/* Create Sprint */}
      <div>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#edf3fb]">Create New Sprint</h3>
        <CreateSprintForm action={createSprint} teamId={String(teamId)} projectId={String(projectId)} existingSprints={[...activeSprints, ...plannedSprints, ...endedSprints]} />
      </div>

      {/* Ended Sprints */}
      <div>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#c3ceda]">Ended Sprints</h2>
        {endedSprints.length === 0 && (
          <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-4 text-sm text-[#c3ceda]">No completed sprints yet.</div>
        )}
        {endedSprints.map((sprint) => (
          <div key={sprint.id_sprint} className="mb-6 rounded-xl border border-[#667386] bg-[#1f2630] p-6 opacity-70">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-semibold text-[#c3ceda]">Sprint {sprint.id_sprint} <span className="text-xs">({formatDate(sprint.start_date)} → {formatDate(sprint.end_date)})</span></h3>
              <Link href={`/projects/${projectId}/team/${teamId}/sprints/${sprint.id_sprint}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#667386] bg-[#28313d] px-3 py-2 text-xs text-[#c3ceda] transition hover:text-[#ffffff]">
                <ChartIcon />Sprint Stats
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className={taskTableClass}>
                {endedSprintColumnGroup}
                <thead><tr>
                  <th className={thClass}>Name</th><th className={thClass}>Desc</th>
                  <th className={thClass}>Pts</th><th className={thClass}>Risk</th>
                  <th className={thClass}>Priority</th><th className={thClass}>Member</th>
                </tr></thead>
                <tbody>
                  {sprint.tasks.length === 0
                    ? <tr><td colSpan={6} className="p-4 text-center text-xs text-[#93a0b1]">No tasks.</td></tr>
                    : sprint.tasks.map((task) => {
                      const member = team.team_members.find((m) => m.id_team_member === task.fk_team_memberid_team_member);
                      return (
                        <TaskDetailsTrigger                             key={`${task.id_task}-${task.fk_team_memberid_team_member}`}                             task={task}                             members={taskModalMembers}                             className={trClass}
                          >

                          <td className={tdClass}><div className={taskNameClass}>{task.name ?? "—"}</div></td>
                          <td className={tdClass}><div className={descriptionClass} title={task.description?.trim() || undefined}>{task.description?.trim() || "—"}</div></td>
                          <td className={tdClass}>{task.story_points ?? "—"}</td>
                          <td className={tdClass}>{getRiskOrPriorityName(task.risk)}</td>
                          <td className={tdClass}>{getRiskOrPriorityName(task.priority)}</td>
                          <td className={tdClass}>{member ? member.user.name : "Unassigned"}</td>
                        </TaskDetailsTrigger>
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
