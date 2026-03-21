import { createTask, assignTaskToTeam } from "./actions";
import Navbar from "@/app/components/navbar";
import Link from "next/link";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

async function fetchWithAuth(url: string) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(`${API_URL}${url}`, {
    cache: "no-store",
    headers: {
      "Cookie": cookieHeader
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch ${url}`);

  return res.json();
}

async function getTeamsWithTasks(projectId: string) {
  return fetchWithAuth(`/api/projects/${projectId}/teams`);
}

async function getProject(id: string) {
  return fetchWithAuth(`/api/projects/${id}`);
}

async function getTasks(projectId: string) {
  return fetchWithAuth(`/api/tasks?project_id=${projectId}`);
}

export default async function BacklogView({ params }: any) {
  const { id } = await params;

  const project = await getProject(id);
  const tasks = await getTasks(id); // unassigned tasks
  const teams = await getTeamsWithTasks(id); // teams + tasks

  return (
    <div className="min-h-screen bg-[#f5ede3] text-[#3e2a1f]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid grid-cols-[260px_1fr] gap-8">

          {/* LEFT SIDEBAR */}
          <aside className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-6 shadow-md">
            <h2 className="mb-6 text-2xl font-bold text-[#5c3b28]">Menu</h2>

            <div className="space-y-4">
              <Link
                href={`/projects/${id}`}
                className="block w-full rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3 text-left text-[#4b2e1f] font-medium transition hover:-translate-y-1 hover:shadow"
              >
                ← Back
              </Link>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <div className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-8 shadow-md">

            {/* UNASSIGNED TASKS */}
            <h2 className="text-2xl font-bold text-[#5c3b28] mb-4">Unassigned Tasks</h2>

            <table className="w-full border-collapse rounded-lg overflow-hidden">
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

                {tasks.map((task: any) => (
                  <tr
                    key={task.id_task}
                    className="border-b border-[#d8c2a8] hover:bg-[#f7efe7]"
                  >
                    <td className="p-3">{task.name}</td>
                    <td className="p-3">{task.description}</td>
                    <td className="p-3">{task.story_points}</td>
                    <td className="p-3">{task.risk}</td>
                    <td className="p-3">{task.priority}</td>

                    {/* ASSIGN TEAM DROPDOWN */}
                    <td className="p-3">
                      <form action={assignTaskToTeam} className="flex gap-2 items-center">
                        <input type="hidden" name="task_id" value={task.id_task} />
                        <input type="hidden" name="project_id" value={id} />

                        <select
                          name="team_id"
                          className="rounded-lg border border-[#c8a27a] p-2 bg-white"
                        >
                          <option value="null">Remove team</option>
                          {teams.map((team: any) => (
                            <option key={team.team_id} value={team.team_id}>
                              {team.team_name}
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

            {/* TEAMS + THEIR TASKS */}
            <h2 className="text-2xl font-bold text-[#5c3b28] mt-10 mb-4">Teams</h2>

            {teams.map((team: any) => (
              <div key={team.team_id} className="mb-10">
                <h3 className="text-xl font-semibold text-[#4b2e1f] mb-2">
                  Team {team.team_name}
                </h3>

                <table className="w-full border-collapse rounded-lg overflow-hidden">
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

                    {team.tasks.map((task: any) => (
                      <tr
                        key={task.id_task}
                        className="border-b border-[#d8c2a8] hover:bg-[#f7efe7]"
                      >
                        <td className="p-3">{task.name}</td>
                        <td className="p-3">{task.description}</td>
                        <td className="p-3">{task.story_points}</td>
                        <td className="p-3">{task.risk}</td>
                        <td className="p-3">{task.priority}</td>

                        {/* ASSIGN TEAM DROPDOWN */}
                        <td className="p-3">
                          <form action={assignTaskToTeam} className="flex gap-2 items-center">
                            <input type="hidden" name="task_id" value={task.id_task} />
                            <input type="hidden" name="project_id" value={id} />

                            <select
                              name="team_id"
                              className="rounded-lg border border-[#c8a27a] p-2 bg-white"
                            >
                              <option value="null">Remove team</option>
                              {teams.map((t: any) => (
                                <option key={t.team_id} value={t.team_id}>
                                  {t.team_name}
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

            {/* CREATE NEW TASK */}
            <h3 className="text-xl font-bold text-[#5c3b28] mt-10 mb-4">
              Create New Task
            </h3>

            <form
              action={createTask}
              className="space-y-4 bg-[#fdf7f2] p-6 rounded-xl border border-[#c8a27a]"
            >
              <input type="hidden" name="fk_projectid_project" value={id} />

              <div>
                <label className="block mb-1 font-medium">Name</label>
                <input
                  name="name"
                  required
                  className="w-full rounded-lg border border-[#c8a27a] p-3"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">Description</label>
                <textarea
                  name="description"
                  className="w-full rounded-lg border border-[#c8a27a] p-3"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">Story Points</label>
                <input
                  type="number"
                  step="0.1"
                  name="story_points"
                  className="w-full rounded-lg border border-[#c8a27a] p-3"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">Risk</label>
                <input
                  type="number"
                  name="risk"
                  className="w-full rounded-lg border border-[#c8a27a] p-3"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">Priority</label>
                <input
                  type="number"
                  name="priority"
                  className="w-full rounded-lg border border-[#c8a27a] p-3"
                />
              </div>

              <button
                type="submit"
                className="rounded-lg bg-[#b08968] px-6 py-3 text-white font-semibold hover:bg-[#8c6a4f]"
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
