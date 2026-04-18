import BacklogDragBoard from "./BacklogDragBoard";
import { createTask } from "./actions";
import { apiFetch } from "@/app/lib/api";
import { requireAuth } from "@/app/lib/auth";

const RiskAndPriority = [
  { id: 1, name: "Very low" },
  { id: 2, name: "Low" },
  { id: 3, name: "Medium" },
  { id: 4, name: "High" },
  { id: 5, name: "Very high" },
];

type Task = {
  id_task: number;
  name: string;
  description: string | null;
  story_points: number | null;
  risk: number | null;
  priority: number | null;
  fk_teamid_team: number | null;
};

type TeamSummary = { id_team: number; name: string | null };
type TeamBacklog = { team_id: number; team_name: string | null; tasks: Task[] };

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

  let tasks: Task[] = [];
  let teams: TeamBacklog[] = [];
  let errorMessage: string | null = null;

  try {
    await getProject(id);
    tasks = await getTasks(id);
    teams = await getTeamsWithTasks(id);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load backlog data.";
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#39ff14]">Backlog</p>
        <h1 className="mt-1 text-2xl font-bold text-[#f0f0f0]">Project Backlog</h1>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-[#ff4040]/20 bg-[#ff4040]/05 p-6 text-[#ff8080]">
          <h2 className="mb-2 text-lg font-bold">Unable to load backlog</h2>
          <p className="text-sm">{errorMessage}</p>
        </div>
      ) : (
        <>
          <BacklogDragBoard projectId={id} tasks={tasks} teams={teams} />

          <div className="mt-10">
            <h3 className="mb-4 text-base font-bold text-[#f0f0f0]">Create New Task</h3>
            <form action={createTask} className="space-y-4 rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-6">
              <input type="hidden" name="fk_projectid_project" value={id} />

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#555]">Name</label>
                <input name="name" required className="w-full rounded-lg border border-[#1e1e1e] bg-[#111] px-4 py-3 text-sm text-[#f0f0f0] outline-none placeholder:text-[#333] focus:border-[rgba(57,255,20,0.3)]" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#555]">Description</label>
                <textarea name="description" rows={3} className="w-full rounded-lg border border-[#1e1e1e] bg-[#111] px-4 py-3 text-sm text-[#f0f0f0] outline-none placeholder:text-[#333] focus:border-[rgba(57,255,20,0.3)]" />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#555]">Story Points</label>
                  <input type="number" step="0.1" name="story_points" className="w-full rounded-lg border border-[#1e1e1e] bg-[#111] px-4 py-3 text-sm text-[#f0f0f0] outline-none focus:border-[rgba(57,255,20,0.3)]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#555]">Risk</label>
                  <select name="risk" defaultValue="3" className="w-full rounded-lg border border-[#1e1e1e] bg-[#111] px-4 py-3 text-sm text-[#f0f0f0] outline-none focus:border-[rgba(57,255,20,0.3)]">
                    {RiskAndPriority.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#555]">Priority</label>
                  <select name="priority" defaultValue="3" className="w-full rounded-lg border border-[#1e1e1e] bg-[#111] px-4 py-3 text-sm text-[#f0f0f0] outline-none focus:border-[rgba(57,255,20,0.3)]">
                    {RiskAndPriority.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" className="rounded-lg border border-[rgba(57,255,20,0.3)] bg-[rgba(57,255,20,0.08)] px-5 py-2.5 text-sm font-bold text-[#39ff14] transition hover:bg-[rgba(57,255,20,0.14)]">
                Create Task
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
