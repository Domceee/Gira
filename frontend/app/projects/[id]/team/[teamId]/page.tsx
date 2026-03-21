import Navbar from "@/app/components/navbar";
import Link from "next/link";
import { createSprint, assignTaskToSprint } from "./actions";
import { cookies } from "next/headers";

function isSprintEnded(sprint: any) {
  return new Date(sprint.end_date) < new Date();
}
function formatDate(dateString: string) {
  return new Date(dateString).toISOString().split("T")[0];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

async function fetchWithAuth(url: string) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(`${API_URL}${url}`, {
    cache: "no-store",
    headers: {
      Cookie: cookieHeader,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }

  return res.json();
}

async function getTeam(projectId: string, teamId: string) {
  return fetchWithAuth(`/api/projects/${projectId}/teams/${teamId}`);
}

async function getSprints(teamId: string) {
  return fetchWithAuth(`/api/sprints?team_id=${teamId}`);
}

export default async function TeamView({ params }: any) {
  
  const { id, teamId } = await params;
  //console.log("PARAMS:", params);
  const team = await getTeam(id, teamId);
  const sortedSprints = (await getSprints(teamId)).sort(
  (a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  const activeSprints = sortedSprints.filter((s: any) => !isSprintEnded(s));
  const endedSprints = sortedSprints.filter((s: any) => isSprintEnded(s));

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
                ← Back to Project
              </Link>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <div className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-8 shadow-md">

            {/* TEAM HEADER */}
            <h1 className="text-3xl font-bold text-[#5c3b28] mb-6">
              Team {team.team_name}
            </h1>

            {/* BACKLOG */}
            <h2 className="text-2xl font-bold text-[#5c3b28] mb-4">Team Backlog</h2>

            <table className="w-full border-collapse rounded-lg overflow-hidden">
              <thead className="bg-[#e8d6c3] text-[#4b2e1f]">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-left">Story Points</th>
                  <th className="p-3 text-left">Risk</th>
                  <th className="p-3 text-left">Priority</th>
                  <th className="p-3 text-left">Sprint</th>
                </tr>
              </thead>

              <tbody>
                {team.tasks.filter((t: any) => t.fk_sprintid_sprint === null).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-[#6f4e37]">
                      No tasks in backlog.
                    </td>
                  </tr>
                ) : (
                  team.tasks
                    .filter((task: any) => task.fk_sprintid_sprint === null)
                    .map((task: any) => (
                      <tr
                        key={task.id_task}
                        className="border-b border-[#d8c2a8] hover:bg-[#f7efe7]"
                      >
                        <td className="p-3">{task.name}</td>
                        <td className="p-3">{task.description}</td>
                        <td className="p-3">{task.story_points}</td>
                        <td className="p-3">{task.risk}</td>
                        <td className="p-3">{task.priority}</td>

                        <td className="p-3">
                          <form action={assignTaskToSprint} className="flex gap-2 items-center">
                            <input type="hidden" name="task_id" value={task.id_task} />
                            <input type="hidden" name="team_id" value={teamId} />
                            <input type="hidden" name="project_id" value={id} />

                            <select
                              name="sprint_id"
                              className="rounded-lg border border-[#c8a27a] p-2 bg-white"
                            >
                              <option value="null">Remove from sprint</option>
                              {sortedSprints.map((s: any) => (
                                <option key={s.id_sprint} value={s.id_sprint}>
                                  Sprint {s.id_sprint}
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

            <h2 className="text-2xl font-bold text-[#5c3b28] mt-10 mb-4">Sprints</h2>

            {/* ACTIVE SPRINTS */}
            {activeSprints.map((sprint: any) => (
              <div key={sprint.id_sprint} className="mb-10">
                <h3 className="text-xl font-semibold text-[#4b2e1f] mb-2">
                  Sprint {sprint.id_sprint} ({formatDate(sprint.start_date)} → {formatDate(sprint.end_date)})
                </h3>

                <table className="w-full border-collapse rounded-lg overflow-hidden">
                  <thead className="bg-[#e8d6c3] text-[#4b2e1f]">
                    <tr>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Description</th>
                      <th className="p-3 text-left">Story Points</th>
                      <th className="p-3 text-left">Risk</th>
                      <th className="p-3 text-left">Priority</th>
                      <th className="p-3 text-left">Actions</th>
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
                      sprint.tasks.map((task: any) => (
                        <tr key={task.id_task} className="border-b border-[#d8c2a8] hover:bg-[#f7efe7]">
                          <td className="p-3">{task.name}</td>
                          <td className="p-3">{task.description}</td>
                          <td className="p-3">{task.story_points}</td>
                          <td className="p-3">{task.risk}</td>
                          <td className="p-3">{task.priority}</td>

                          <td className="p-3">
                            {/* ACTIVE sprint → allow moving/removing */}
                            <form action={assignTaskToSprint} className="flex gap-2 items-center">
                              <input type="hidden" name="task_id" value={task.id_task} />
                              <input type="hidden" name="team_id" value={teamId} />
                              <input type="hidden" name="project_id" value={id} />

                              <select name="sprint_id" className="rounded-lg border border-[#c8a27a] p-2 bg-white">
                                <option value="null">Move to Backlog</option>
                                {sortedSprints.map((s: any) => (
                                  <option key={s.id_sprint} value={s.id_sprint}>
                                    Sprint {s.id_sprint}
                                  </option>
                                ))}
                              </select>

                              <button type="submit" className="rounded-lg bg-[#b08968] px-3 py-2 text-white hover:bg-[#8c6a4f]">
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

            {/* CREATE NEW SPRINT */}
            <h3 className="text-xl font-bold text-[#5c3b28] mt-10 mb-4">
              Create New Sprint
            </h3>

            <form
              action={createSprint}
              className="space-y-4 bg-[#fdf7f2] p-6 rounded-xl border border-[#c8a27a]"
            >
              <input type="hidden" name="team_id" value={teamId} />
              <input type="hidden" name="project_id" value={id} />

              <div>
                <label className="block mb-1 font-medium">Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  required
                  className="w-full rounded-lg border border-[#c8a27a] p-3"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">End Date</label>
                <input
                  type="date"
                  name="end_date"
                  required
                  className="w-full rounded-lg border border-[#c8a27a] p-3"
                />
              </div>

              <button
                type="submit"
                className="rounded-lg bg-[#b08968] px-6 py-3 text-white font-semibold hover:bg-[#8c6a4f]"
              >
                Create Sprint
              </button>
            </form>


            <h2 className="text-2xl font-bold text-gray-500 mt-10 mb-4">Ended Sprints</h2>

              {endedSprints.map((sprint: any) => (
                <div key={sprint.id_sprint} className="mb-10 opacity-60">
                  <h3 className="text-xl font-semibold text-gray-500 mb-2">
                    Sprint {sprint.id_sprint} ({formatDate(sprint.start_date)} → {formatDate(sprint.end_date)})
                  </h3>

                  <table className="w-full border-collapse rounded-lg overflow-hidden">
                    <thead className="bg-[#e8d6c3] text-[#4b2e1f]">
                      <tr>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-left">Description</th>
                        <th className="p-3 text-left">Story Points</th>
                        <th className="p-3 text-left">Risk</th>
                        <th className="p-3 text-left">Priority</th>
                      </tr>
                    </thead>

                    <tbody>
                      {sprint.tasks.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-[#6f4e37]">
                            No tasks in this sprint.
                          </td>
                        </tr>
                      ) : (
                        sprint.tasks.map((task: any) => (
                          <tr key={task.id_task} className="border-b border-[#d8c2a8]">
                            <td className="p-3">{task.name}</td>
                            <td className="p-3">{task.description}</td>
                            <td className="p-3">{task.story_points}</td>
                            <td className="p-3">{task.risk}</td>
                            <td className="p-3">{task.priority}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        </section>
      </main>
    </div>
  );
}