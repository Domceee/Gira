import Navbar from "@/app/components/navbar";
import DescriptionButton from "@/app/components/DescriptionButton";

import Link from "next/link";
import { CalendarX } from "lucide-react";
import { createSprint, assignTaskToSprint, assignTaskToMember, closeSprint } from "./actions";
import TaskStatusForm from "./TaskStatusForm";

import CreateSprintForm from "./create-sprint-form";
import { apiFetch } from "@/app/lib/api";
import { requireAuth } from "@/app/lib/auth";

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
  user: {
    id_user: number;
    name: string;
    email: string;
    picture: string | null;
  };
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

function ChartIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 3 3 5-7" />
    </svg>
  );
}

function formatDate(dateString: string) {
  return dateString.split("T")[0];
}

async function getTeam(projectId: string, teamId: string): Promise<TeamBacklog> {
  const res = await apiFetch(`/api/projects/${projectId}/teams/${teamId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch team");
  return res.json();
}

async function getSprints(teamId: string): Promise<Sprint[]> {
  const res = await apiFetch(`/api/sprints?team_id=${teamId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch sprints");
  return res.json();
}


export default function TeamViewContent({
  team,
  projectId,
  teamId,
  activeSprints,
  plannedSprints,
  endedSprints,
}: {
  team: TeamBacklog;
  projectId: string;
  teamId: string | number;
  activeSprints: Sprint[];
  plannedSprints: Sprint[];
  endedSprints: Sprint[];
}) {
  return (
    <div className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-8 shadow-md">
            <h1 className="mb-6 text-3xl font-bold text-[#5c3b28]">Team {team.team_name}</h1>

            <h2 className="mb-4 text-2xl font-bold text-[#5c3b28]">Team Backlog</h2>

            <table className="w-full rounded-lg border-collapse">
              <thead className="bg-[#e8d6c3] text-[#4b2e1f]">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-left">Story Points</th>
                  <th className="p-3 text-left">Risk</th>
                  <th className="p-3 text-left">Priority</th>
                  <th className="p-3 text-left">Sprint</th>
                  <th className="p-3 text-left">Member</th>
                  <th className="p-3 text-left"></th>
                </tr>
              </thead>

              <tbody>
                {team.tasks.filter((t) => t.fk_sprintid_sprint === null).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-[#6f4e37]">
                      No tasks in backlog.
                    </td>
                  </tr>
                ) : (
                  team.tasks
                    .filter((task) => task.fk_sprintid_sprint === null)
                    .map((task) => (
                      <tr
                        key={task.id_task}
                        className="border-b border-[#d8c2a8] hover:bg-[#f7efe7]"
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

                        {/* Sprint assignment */}
                        <td className="p-3">
                          <form action={assignTaskToSprint} className="flex gap-2 items-center">
                            <input type="hidden" name="task_id" value={task.id_task} />
                            <input type="hidden" name="team_id" value={teamId} />
                            <input type="hidden" name="project_id" value={projectId} />

                            <select
                                  name="sprint_id"
                                  className="rounded-lg border border-[#c8a27a] bg-white p-2"
                                  defaultValue={task.fk_sprintid_sprint ?? "null"}
                                >
                                  <option value="null">Backlog</option>

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
                              className="rounded-lg bg-[#b08968] px-3 py-2 text-white hover:bg-[#8c6a4f]"
                            >
                              Save
                            </button>
                          </form>
                        </td>

                        {/* Member assignment */}
                        <td className="p-3">
                            <AssignMemberForm
                              taskId={task.id_task}
                              teamId={String(teamId)}
                              projectId={projectId}
                              teamMembers={team.team_members}
                              defaultValue={task.fk_team_memberid_team_member}
                            />

                        </td>


                        <td className="p-3">
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
                    ))
                )}
              </tbody>
            </table>

            <h2 className="mb-4 mt-10 text-2xl font-bold text-[#5c3b28]">Sprints</h2>
            <p className="mb-6 max-w-3xl text-[#6f4e37]">
              Each sprint has its own statistics page. Use the{" "}
              <span className="font-semibold">&quot;View Sprint Stats&quot;</span>{" "}
              button on a sprint row to open the burndown and totals view.
            </p>

            {activeSprints.length === 0 && (
              <div className="mb-8 rounded-2xl border border-[#d4b08a] bg-[#fdf7f2] p-5 text-[#6f4e37]">
                No active sprints yet. Create one below and its stats page will become available
                automatically.
              </div>
            )}

            {activeSprints.map((sprint) => (
              <div key={sprint.id_sprint} className="mb-10">
                <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-xl font-semibold text-[#4b2e1f]">
                    Sprint {sprint.id_sprint} ({formatDate(sprint.start_date)} to{" "}
                    {formatDate(sprint.end_date)})
                  </h3>

                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/projects/${projectId}/team/${teamId}/sprints/${sprint.id_sprint}`}
                      className="inline-flex items-center gap-2 self-start rounded-xl border border-[#c8a27a] bg-[#fdf7f2] px-4 py-2 text-sm font-semibold text-[#4b2e1f] transition hover:-translate-y-0.5 hover:shadow"
                      title={`View sprint ${sprint.id_sprint} statistics`}
                    >
                      <ChartIcon className="h-4 w-4" />
                      View Sprint Stats
                    </Link>

                    <form action={closeSprint}>
                      <input type="hidden" name="sprint_id" value={sprint.id_sprint} />
                      <input type="hidden" name="team_id" value={teamId} />
                      <input type="hidden" name="project_id" value={projectId} />

                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-xl border border-[#c98d6a] bg-[#fff1e6] px-4 py-2 text-sm font-semibold text-[#8a3f23] transition hover:-translate-y-0.5 hover:shadow"
                        title={`Close sprint ${sprint.id_sprint}`}
                      >
                        <CalendarX className="h-4 w-4" />
                        Close Sprint
                      </button>
                    </form>
                  </div>
                </div>

                <table className="w-full overflow-hidden rounded-lg border-collapse">
                  <thead className="bg-[#e8d6c3] text-[#4b2e1f]">
                    <tr>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Description</th>
                      <th className="p-3 text-left">Story Points</th>
                      <th className="p-3 text-left">Risk</th>
                      <th className="p-3 text-left">Priority</th>
                      <th className="p-3 text-left">Member</th>
                      <th className="p-3 text-left">Actions</th>
                      <th className="p-3 text-left">Sprint</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sprint.tasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-[#6f4e37]">
                          No tasks in this sprint.
                        </td>
                      </tr>
                    ) : (
                      [...sprint.tasks]
                        .sort((a, b) => a.id_task - b.id_task)
                        .map((task) => (
                        <tr
                          key={task.id_task}
                          className="border-b border-[#d8c2a8] hover:bg-[#f7efe7]"
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

                          {/* Member assignment */}
                          <td className="p-3">
                            <AssignMemberForm
                              taskId={task.id_task}
                              teamId={String(teamId)}
                              projectId={projectId}
                              teamMembers={team.team_members}
                              defaultValue={task.fk_team_memberid_team_member}
                            />
                          </td>
                          <td className="p-3">
                            <TaskStatusForm
                              key={task.id_task + "-" + task.workflow_status}
                              taskId={task.id_task}
                              teamId={String(teamId)}
                              projectId={projectId}
                              defaultValue={task.workflow_status}
                            />

                          </td>
                         

                          {/* Sprint assignment */}
                          <td className="p-3">
                            <form action={assignTaskToSprint} className="flex gap-2 items-center">
                              <input type="hidden" name="task_id" value={task.id_task} />
                              <input type="hidden" name="team_id" value={teamId} />
                              <input type="hidden" name="project_id" value={projectId} />
                                  <select
                                    name="sprint_id"
                                    className="rounded-lg border border-[#c8a27a] bg-white p-2"
                                    defaultValue={task.fk_sprintid_sprint ?? sprint.id_sprint}
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
                                className="rounded-lg bg-[#b08968] px-3 py-2 text-white hover:bg-[#8c6a4f]"
                              >
                                Save
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ))}

            <h2 className="mb-4 mt-10 text-2xl font-bold text-[#7d624a]">Planned Sprints</h2>

            {plannedSprints.length === 0 && (
              <div className="mb-8 rounded-2xl border border-[#d4b08a] bg-[#fdf7f2] p-5 text-[#6f4e37]">
                No planned sprints yet.
              </div>
            )}

            {plannedSprints.map((sprint) => (
              <div key={sprint.id_sprint} className="mb-10">
                <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-xl font-semibold text-[#7d624a]">
                    Sprint {sprint.id_sprint} ({formatDate(sprint.start_date)} to{" "}
                    {formatDate(sprint.end_date)})
                  </h3>

                  <Link
                    href={`/projects/${projectId}/team/${teamId}/sprints/${sprint.id_sprint}`}
                    className="inline-flex items-center gap-2 self-start rounded-xl border border-[#c8a27a] bg-[#fdf7f2] px-4 py-2 text-sm font-semibold text-[#4b2e1f] transition hover:-translate-y-0.5 hover:shadow"
                    title={`View sprint ${sprint.id_sprint} statistics`}
                  >
                    <ChartIcon className="h-4 w-4" />
                    View Sprint Stats
                  </Link>
                </div>

                <table className="w-full overflow-hidden rounded-lg border-collapse">
                  <thead className="bg-[#e8d6c3] text-[#4b2e1f]">
                    <tr>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Description</th>
                      <th className="p-3 text-left">Story Points</th>
                      <th className="p-3 text-left">Risk</th>
                      <th className="p-3 text-left">Priority</th>
                      <th className="p-3 text-left">Member</th>
                      <th className="p-3 text-left">Actions</th>
                      <th className="p-3 text-left">Sprint</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sprint.tasks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-[#6f4e37]">
                          No tasks in this sprint.
                        </td>
                      </tr>
                    ) : (
                      [...sprint.tasks]
                        .sort((a, b) => a.id_task - b.id_task)
                        .map((task) => (
                        <tr key={task.id_task} className="border-b border-[#d8c2a8]">
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
                              <AssignMemberForm
                                taskId={task.id_task}
                                teamId={String(teamId)}
                                projectId={projectId}
                                teamMembers={team.team_members}
                                defaultValue={task.fk_team_memberid_team_member}
                              />

                          </td>
                             <td className="p-3">
                            <TaskStatusForm
                              key={task.id_task + "-" + task.workflow_status}
                              taskId={task.id_task}
                              teamId={String(teamId)}
                              projectId={projectId}
                              defaultValue={task.workflow_status}
                            />

                          </td>
                           
                          <td className="p-3">
                            <form action={assignTaskToSprint} className="flex gap-2 items-center">
                              <input type="hidden" name="task_id" value={task.id_task} />
                              <input type="hidden" name="team_id" value={teamId} />
                              <input type="hidden" name="project_id" value={projectId} />

                              <select
                                name="sprint_id"
                                className="rounded-lg border border-[#c8a27a] bg-white p-2"
                                defaultValue={task.fk_sprintid_sprint ?? sprint.id_sprint}
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
                                className="rounded-lg bg-[#b08968] px-3 py-2 text-white hover:bg-[#8c6a4f]"
                              >
                                Save
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ))}

            <h3 className="mb-4 mt-10 text-xl font-bold text-[#5c3b28]">Create New Sprint</h3>

                <CreateSprintForm
                  action={createSprint}
                  teamId={String(teamId)}
                  projectId={String(projectId)}
                  existingSprints={[
                    ...activeSprints,
                    ...plannedSprints,
                    ...endedSprints
                  ]}
                />


            <h2 className="mb-4 mt-10 text-2xl font-bold text-gray-500">Ended Sprints</h2>

            {endedSprints.length === 0 && (
              <div className="mb-8 rounded-2xl border border-[#d4b08a] bg-[#fdf7f2] p-5 text-[#6f4e37]">
                No completed sprints yet.
              </div>
            )}

            {endedSprints.map((sprint) => (
              <div key={sprint.id_sprint} className="mb-10">
                <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-xl font-semibold text-gray-500">
                    Sprint {sprint.id_sprint} ({formatDate(sprint.start_date)} to{" "}
                    {formatDate(sprint.end_date)})
                  </h3>

                  <Link
                    href={`/projects/${projectId}/team/${teamId}/sprints/${sprint.id_sprint}`}
                    className="inline-flex items-center gap-2 self-start rounded-xl border border-[#c8a27a] bg-[#fdf7f2] px-4 py-2 text-sm font-semibold text-[#4b2e1f] transition hover:-translate-y-0.5 hover:shadow"
                    title={`View sprint ${sprint.id_sprint} statistics`}
                  >
                    <ChartIcon className="h-4 w-4" />
                    View Sprint Stats
                  </Link>
                </div>

                <table className="w-full overflow-hidden rounded-lg border-collapse">
                  <thead className="bg-[#e8d6c3] text-[#4b2e1f]">
                    <tr>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Description</th>
                      <th className="p-3 text-left">Story Points</th>
                      <th className="p-3 text-left">Risk</th>
                      <th className="p-3 text-left">Priority</th>
                      <th className="p-3 text-left">Member</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sprint.tasks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-[#6f4e37]">
                          No tasks in this sprint.
                        </td>
                      </tr>
                    ) : (
                      sprint.tasks.map((task) => {
                        const member = team.team_members.find(
                          (m) => m.id_team_member === task.fk_team_memberid_team_member
                        );

                        return (
                          <tr key={task.id_task} className="border-b border-[#d8c2a8]">
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
                              {member ? member.user.name : "Unassigned"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
  );
}
