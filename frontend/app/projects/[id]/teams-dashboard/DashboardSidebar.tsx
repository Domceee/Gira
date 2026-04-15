"use client";

import Link from "next/link";

export default function DashboardSidebar({ projectId }: { projectId: string }) {
  return (
    <aside className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-6 shadow-md">
      <h2 className="mb-6 text-2xl font-bold text-[#5c3b28]">
        Menu
      </h2>

      <div className="space-y-4">
        <Link
          href={`/projects/${projectId}/board`}
          className="block w-full rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3 text-left text-[#4b2e1f] font-medium transition hover:-translate-y-1 hover:shadow"
        >
          Board
        </Link>
      </div>

      <div className="space-y-4 mt-4">
        <Link
          href={`/projects/${projectId}/backlog`}
          className="block w-full rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3 text-left text-[#4b2e1f] font-medium transition hover:-translate-y-1 hover:shadow"
        >
          Backlog
        </Link>
      </div>

      <div className="space-y-4 mt-4">
        <Link
          href={`/projects/${projectId}/teams-dashboard`}
          className="block w-full rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3 text-left text-[#4b2e1f] font-medium transition hover:-translate-y-1 hover:shadow"
        >
          Select Team
        </Link>
      </div>
    </aside>
  );
}
