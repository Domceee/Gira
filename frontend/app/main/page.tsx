import Link from "next/link";
import Navbar from "../components/navbar";
import InvitationsBlock from "../components/InvitationsBlock";
import { apiFetch } from "../lib/api";
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
    <div className="min-h-screen bg-[#080808] text-[#f0f0f0]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr_0.9fr]">

          {/* PROJECTS */}
          <div className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#f0f0f0]">Projects</h2>
              <Link
                href="/projectNew"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1e1e1e] bg-[#111] text-xl font-bold text-[#39ff14] transition hover:bg-[#161616] hover:border-[rgba(57,255,20,0.3)]"
              >
                +
              </Link>
            </div>

            <div className="space-y-3">
              {projects.length === 0 && (
                <p className="text-sm text-[#444]">No projects yet. Create one to get started.</p>
              )}
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block rounded-lg border border-[#1e1e1e] bg-[#111] p-4 transition hover:border-[#2a2a2a] hover:bg-[#141414]"
                >
                  <h3 className="font-semibold text-[#f0f0f0]">{project.name}</h3>
                  <p className="mt-1 text-sm text-[#555]">
                    {project.description ?? "No description"}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <InvitationsBlock />

            <aside className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-6">
              <h2 className="mb-5 text-2xl font-bold text-[#f0f0f0]">News</h2>
              <div className="space-y-3">
                {news.length === 0 ? (
                  <p className="text-sm text-[#444]">No notifications yet.</p>
                ) : (
                  news.map((item) => (
                    <article key={item.id_news} className="rounded-lg border border-[#1e1e1e] bg-[#111] p-4">
                      <div className="mb-1.5 flex items-center justify-between gap-4">
                        <h3 className="text-sm font-semibold text-[#f0f0f0]">{item.title}</h3>
                        <span className="shrink-0 text-xs text-[#444]">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-[#666]">{item.message}</p>
                    </article>
                  ))
                )}
              </div>
            </aside>
          </div>

        </section>
      </main>
    </div>
  );
}
