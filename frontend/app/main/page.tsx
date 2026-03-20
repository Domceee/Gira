import Link from "next/link";
import Navbar from "../components/navbar";
import { cookies } from "next/headers";
import { apiFetch } from "../lib/api";

async function getProjects() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await apiFetch("/api/projects", {
    method: "GET",
    cache: "no-store",
    cookie: cookieHeader,
  });

  if (!res.ok) {
    throw new Error("Failed to fetch projects");
  }

  return res.json();
}

const news = [
  {
    id: 1,
    title: "v0.1 blog",
    content: "added function to...",
    date: "2025-04-01",
  },
  {
    id: 2,
    title: "Team update",
    content: "komanda atostogauja :)",
    date: "2026-04-01",
  },
  {
    id: 3,
    title: "Coming soon",
    content: "kazkas..",
    date: "2025-04-01",
  },
];

export default async function HomePage() {
  const projects = await getProjects();

  return (
    <div className="min-h-screen bg-[#f5ede3] text-[#3e2a1f]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr_0.9fr]">

          {/* PROJECTS */}
          <div className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-6 shadow-md">

            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-3xl font-bold text-[#5c3b28]">Projects</h2>

              <Link
                href="/projectNew"
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#8b5e3c] bg-[#a47148] text-3xl font-bold text-white transition hover:scale-105 hover:bg-[#8b5e3c]"
              >
                +
              </Link>
            </div>

            <div className="space-y-5">

              {projects.length === 0 && (
                <p className="text-[#6f4e37]">No projects yet.</p>
              )}

              {projects.map((project: any) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block rounded-xl border border-[#c8a27a] bg-[#fdf7f2] p-5 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <h3 className="text-2xl font-semibold text-[#4b2e1f]">
                    {project.name}
                  </h3>

                  <p className="mt-2 text-sm text-[#6f4e37]">
                    {project.description ?? "No description"}
                  </p>
                </Link>
              ))}

            </div>
          </div>

          {/* NEWS */}
          <aside className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-6 shadow-md">
            <h2 className="mb-6 text-3xl font-bold text-[#5c3b28]">News</h2>

            <div className="space-y-4">
              {news.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-[#d8b692] bg-[#fdf7f2] p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold text-[#7b4b2a]">
                      {item.title}
                    </h3>
                    <span className="text-xs text-[#8b6b4a]">{item.date}</span>
                  </div>

                  <p className="text-sm leading-6 text-[#5a4335]">
                    {item.content}
                  </p>
                </article>
              ))}
            </div>
          </aside>

        </section>
      </main>
    </div>
  );
}