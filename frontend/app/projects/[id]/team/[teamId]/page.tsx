import Navbar from "@/app/components/navbar";
import DescriptionButton from "@/app/components/DescriptionButton";

import Link from "next/link";
import { CalendarX } from "lucide-react";
import { createSprint, assignTaskToSprint, assignTaskToMember, closeSprint } from "./actions";
import TaskStatusForm from "./TaskStatusForm";

import CreateSprintForm from "./create-sprint-form";
import { apiFetch } from "@/app/lib/api";
import { requireAuth } from "@/app/lib/auth";

import TeamViewContent from "./TeamViewContent";
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

  multiple_assignees: boolean;
  multi_assignees: number[];

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
  active_sprints: Sprint[];
  planned_sprints: Sprint[];
  ended_sprints: Sprint[];
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

export default async function TeamView({
  params,
}: {
  params: Promise<{ id: string; teamId: string }>;
}) {
  await requireAuth();
  const { id, teamId } = await params;
  const team = await getTeam(id, teamId);
  const sortedSprints = [...(await getSprints(teamId))].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  const activeSprints = sortedSprints.filter((s) => s.status === "ACTIVE");
  const plannedSprints = sortedSprints.filter((s) => s.status === "PLANNED");
  const endedSprints = sortedSprints.filter((s) => s.status === "COMPLETED");

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
                className="block w-full rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3 text-left text-[#4b2e1f] font-medium transition hover:-translate-y-1 hover:shadow"
              >
                Back to Project
              </Link>
            </div>
          </aside>

          <TeamViewContent
            team={team}
            projectId={id}
            teamId={teamId}
            activeSprints={activeSprints}
            plannedSprints={plannedSprints}
            endedSprints={endedSprints}
          />
        </section>
      </main>
    </div>
  );
}
