import Link from "next/link";
import Navbar from "@/app/components/navbar";
import DescriptionButton from "@/app/components/DescriptionButton";
import AssignMenu from "@/app/components/tasks/AssignMenu";
import BacklogDragBoard from "./BacklogDragBoard";
import { assignTaskToTeam, createTask, deleteTask } from "./actions";
import { apiFetch } from "@/app/lib/api";
import { requireAuth } from "@/app/lib/auth";
import { Trash2 } from 'lucide-react';
import TaskActions from "@/app/components/tasks/TaskActions";

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

  let tasks: Task[] = [];
  let teams: TeamBacklog[] = [];
  let errorMessage: string | null = null;

  try {
    await getProject(id);
    tasks = await getTasks(id);
    teams = await getTeamsWithTasks(id);
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Unable to load backlog data. Please refresh the page.";
  }

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
            {errorMessage ? (
              <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-red-900">
                <h2 className="mb-3 text-2xl font-bold">Unable to load backlog</h2>
                <p>{errorMessage}</p>
              </div>
            ) : (
              <>
                <BacklogDragBoard projectId={id} tasks={tasks} teams={teams} />

                <h3 className="mb-4 mt-10 text-xl font-bold text-[#5c3b28]">Create New Task</h3>
              </>
            )}

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
                  defaultValue="3"
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
                  defaultValue="3"
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
