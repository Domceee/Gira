import Link from "next/link";
import Navbar from "@/app/components/navbar";
import DescriptionButton from "@/app/components/DescriptionButton";
import { assignTaskToTeam, createTask, deleteTask } from "./actions";
import { apiFetch } from "@/app/lib/api";
import { requireAuth } from "@/app/lib/auth";
import { Trash2 } from 'lucide-react';

const RiskAndPriority = [
  { id: 1, name: "Very low" },
  { id: 2, name: "Low" },
  { id: 3, name: "Medium" },
  { id: 4, name: "High" },
  { id: 5, name: "Very high" }
];

function getRiskOrPriorityName(value: number | null) {
  if (value === null) return "—";
  const item = RiskAndPriority.find(r => r.id === value);
  return item ? item.name : "Unknown";
}


type Task = {
  id_task: number;
  name: string;
  description: string | null;
  story_points: number | null;
  risk: number | null;
  priority: number | null;
  fk_teamid_team: number | null;
};

type TeamSummary = {
  id_team: number;
  name: string | null;
};

type TeamBacklog = {
  team_id: number;
  team_name: string | null;
  tasks: Task[];
};

async function getTeamsWithTasks(projectId: string): Promise<TeamBacklog[]> {
  const res = await apiFetch(`/api/projects/${projectId}/teams`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch teams");
  const teams = (await res.json()) as TeamSummary[];

  return Promise.all(
    teams.map(async (team) => {
      const r = await apiFetch(`/api/projects/${projectId}/teams/${team.id_team}`, { cache: "no-store" });
      if (!r.ok) throw new Error("Failed to fetch team backlog");
      return r.json();
    })
  );
}

async function getProject(id: string) {
  const res = await apiFetch(`/api/projects/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch project");
  return res.json();
}

async function getTasks(projectId: string): Promise<Task[]> {
  const res = await apiFetch(`/api/tasks?project_id=${projectId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}





export default async function BacklogView({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  await getProject(id);
  const tasks = await getTasks(id);
  const teams = await getTeamsWithTasks(id);



  
  
  return (
    <div className="min-h-screen bg-[#f5ede3] text-[#3e2a1f]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid grid-cols-[260px_1fr] gap-8">
          <aside className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-6 shadow-md">
            <h2 className="mb-6 text-2xl font-bold text-[#5c3b28]">Menu</h2>

            <div className="space-y-4">
              <Link
                href={`/projects/${id}`}
                className="block w-full rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3 text-left font-medium text-[#4b2e1f] transition hover:-translate-y-1 hover:shadow"
              >
                Back
              </Link>
            </div>
          </aside>

          <div className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-8 shadow-md">
            <h2 className="mb-4 text-2xl font-bold text-[#5c3b28]">Unassigned Tasks</h2>

            <table className="w-full overflow-hidden rounded-lg border-collapse">
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
                  <tr key={task.id_task} className="border-b border-[#d8c2a8] hover:bg-[#f7efe7]">
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
                      <form action={assignTaskToTeam} className="flex items-center gap-2">
                        <input type="hidden" name="task_id" value={task.id_task} />
                        <input type="hidden" name="project_id" value={id} />

                        <select
                          name="team_id"
                          defaultValue={String(task.fk_teamid_team ?? "null")}
                          className="rounded-lg border border-[#c8a27a] bg-white p-2"
                        >
                          {teams.length === 0 ? (
                            <option value="null" disabled>No teams found</option>
                          ) : (
                            teams.map((team) => (
                              <option key={team.team_id} value={team.team_id}>
                                {team.team_name ?? "Unnamed team"}
                              </option>
                            ))
                          )}
                        </select>

                        <button
                          type="submit"
                          className="rounded-lg bg-[#b08968] px-3 py-2 text-white hover:bg-[#8c6a4f]"
                        >
                          Save
                        </button>
                      </form>
                      <form action={deleteTask}>
                        <input type="hidden" name="task_id" value={task.id_task} />
                        <input type="hidden" name="project_id" value={id} />

                        <button
                          type="submit"
                          className="rounded-lg bg-red-600 px-3 py-2 text-white hover:bg-red-700"
                        >
                          <Trash2 size={18} />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2 className="mb-4 mt-10 text-2xl font-bold text-[#5c3b28]">Teams</h2>

            {teams.map((team) => (
              <div key={team.team_id} className="mb-10">
                <h3 className="mb-2 text-xl font-semibold text-[#4b2e1f]">
                  Team {team.team_name ?? "Unnamed team"}
                </h3>

                <table className="w-full overflow-hidden rounded-lg border-collapse">
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
                      <tr key={task.id_task} className="border-b border-[#d8c2a8] hover:bg-[#f7efe7]">
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
                          <form action={assignTaskToTeam} className="flex items-center gap-2">
                            <input type="hidden" name="task_id" value={task.id_task} />
                            <input type="hidden" name="project_id" value={id} />

                            <select
                              name="team_id"
                              defaultValue={String(task.fk_teamid_team ?? "null")}
                              className="rounded-lg border border-[#c8a27a] bg-white p-2"
                            >
                              <option value="null">Remove team</option>
                              {teams.map((optionTeam) => (
                                <option key={optionTeam.team_id} value={optionTeam.team_id}>
                                  {optionTeam.team_name ?? "Unnamed team"}
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
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            <h3 className="mb-4 mt-10 text-xl font-bold text-[#5c3b28]">Create New Task</h3>

            <form
              action={createTask}
              className="space-y-4 rounded-xl border border-[#c8a27a] bg-[#fdf7f2] p-6"
            >
              <input type="hidden" name="fk_projectid_project" value={id} />

              <div>
                <label className="mb-1 block font-medium">Name</label>
                <input
                  name="name"
                  required
                  className="w-full rounded-lg border border-[#c8a27a] p-3"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium">Description</label>
                <textarea
                  name="description"
                  className="w-full rounded-lg border border-[#c8a27a] p-3"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium">Story Points</label>
                <input
                  type="number"
                  step="0.1"
                  name="story_points"
                  className="w-full rounded-lg border border-[#c8a27a] p-3"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium">Risk</label>
                <select
                  name="risk"
                  className="w-full rounded-lg border border-[#c8a27a] p-3"
                  defaultValue=""
                >
                  <option value="" disabled>Select risk</option>
                  {RiskAndPriority.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>


              <div>
                <label className="mb-1 block font-medium">Priority</label>
                <select
                  name="priority"
                  className="w-full rounded-lg border border-[#c8a27a] p-3"
                  defaultValue=""
                >
                  <option value="" disabled>Select priority</option>
                  {RiskAndPriority.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>


              <button
                type="submit"
                className="rounded-lg bg-[#b08968] px-6 py-3 font-semibold text-white hover:bg-[#8c6a4f]"
              >
                Create Task
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
