import Link from "next/link";
import Navbar from "../components/navbar";
import InvitationsBlock from "../components/InvitationsBlock";
import { apiFetch } from "../lib/api";
import NotificationsPager from "./NotificationsPager";

import { requireAuth } from "../lib/auth";

type ProjectListItem = {
  id: number;
  name: string | null;
  description: string | null;
};

type NewsItem = {
  id_news: number;
  title: string;
  message: string;
  created_at: string;
};

async function getProjects() {
  const res = await apiFetch("/api/projects", { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json() as Promise<ProjectListItem[]>;
}

async function getNews() {
  const res = await apiFetch("/api/news", { method: "GET", cache: "no-store" });
  if (!res.ok) return [];
  return res.json() as Promise<NewsItem[]>;
}

export default async function HomePage() {
  await requireAuth();
  const projects = await getProjects();
  const news = await getNews();

  return (
    <div className="min-h-screen bg-[#171c24] text-[#ffffff]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr_0.9fr]">

          {/* PROJECTS */}
          <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#ffffff]">Projects</h2>
              <Link
                href="/projectNew"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#7a8798] bg-[#28313d] text-xl font-bold text-[#39e7ac] transition hover:bg-[#323d4b] hover:border-[rgba(57,231,172,0.40)]"
              >
                +
              </Link>
            </div>

            <div className="space-y-3">
              {projects.length === 0 && (
                <p className="text-sm text-[#c3ceda]">No projects yet. Create one to get started.</p>
              )}
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block rounded-lg border border-[#7a8798] bg-[#28313d] p-4 transition hover:border-[#7b8798] hover:bg-[#3a414d]"
                >
                  <h3 className="font-semibold text-[#ffffff]">{project.name}</h3>
                  <p className="mt-1 text-sm text-[#c3ceda]">
                    {project.description ?? "No description"}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <InvitationsBlock />

            <aside className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-6">
              <h2 className="mb-5 text-2xl font-bold text-[#ffffff]">News</h2>
              <NotificationsPager news={news} />
            </aside>
          </div>

        </section>
      </main>
    </div>
  );
}

