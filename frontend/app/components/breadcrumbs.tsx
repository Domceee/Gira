"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";

const segmentLabels: Record<string, string> = {
  backlog: "Backlog",
  board: "Board",
  manageProject: "Manage Project",
  manageTeam: "Manage Team",
  selectTeam: "Select Team",
  sprints: "Sprints",
  profile: "Profile",
  projectNew: "New Project",
  team: "Team",
};

function getLabel(segment: string, previous: string | null) {
  if (segmentLabels[segment]) return segmentLabels[segment];

  if (/^\d+$/.test(segment)) {
    if (previous === "team") return `Team ${segment}`;
    if (previous === "sprints") return `Sprint ${segment}`;
    return segment;
  }

  return segment
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/^./, (value) => value.toUpperCase());
}

export default function Breadcrumbs() {
  const pathname = usePathname() || "/";
  const rawSegments = pathname.split("/").filter(Boolean);

  const crumbs: Array<{ label: string; href: string }> = [];
  if (rawSegments[0] === "projects" && rawSegments[1]) {
    const projectId = rawSegments[1];
    crumbs.push({ label: "Project", href: `/projects/${projectId}` });

    const isSprintPath = (segment: string, nextSegment?: string) =>
      segment === "sprints" && nextSegment !== undefined && /^\d+$/.test(nextSegment);

    if (rawSegments[2] === "selectTeam") {
      crumbs.push({ label: "Select Team", href: `/projects/${projectId}/selectTeam` });
      if (rawSegments[3] === "team" && rawSegments[4]) {
        crumbs.push({ label: `Team ${rawSegments[4]}`, href: `/projects/${projectId}/team/${rawSegments[4]}` });
        for (let i = 5; i < rawSegments.length; i += 1) {
          const segment = rawSegments[i];
          if (isSprintPath(segment, rawSegments[i + 1])) {
            continue;
          }
          const label = getLabel(segment, rawSegments[i - 1] ?? null);
          const href = `/projects/${projectId}/team/${rawSegments[4]}/${rawSegments.slice(5, i + 1).join("/")}`;
          crumbs.push({ label, href });
        }
      }
    } else if (rawSegments[2] === "team" && rawSegments[3]) {
      crumbs.push({ label: "Select Team", href: `/projects/${projectId}/selectTeam` });
      crumbs.push({ label: `Team ${rawSegments[3]}`, href: `/projects/${projectId}/team/${rawSegments[3]}` });
      for (let i = 4; i < rawSegments.length; i += 1) {
        const segment = rawSegments[i];
        if (isSprintPath(segment, rawSegments[i + 1])) {
          continue;
        }
        const label = getLabel(segment, rawSegments[i - 1] ?? null);
        const href = `/projects/${projectId}/team/${rawSegments[3]}/${rawSegments.slice(4, i + 1).join("/")}`;
        crumbs.push({ label, href });
      }
    } else {
      for (let i = 2; i < rawSegments.length; i += 1) {
        const segment = rawSegments[i];
        const label = getLabel(segment, rawSegments[i - 1] ?? null);
        const href = `/${rawSegments.slice(0, i + 1).join("/")}`;
        crumbs.push({ label, href });
      }
    }
  } else {
    for (let i = 0; i < rawSegments.length; i += 1) {
      const segment = rawSegments[i];
      if (i === 0 && segment === "main") continue;
      const label = getLabel(segment, rawSegments[i - 1] ?? null);
      const href = `/${rawSegments.slice(0, i + 1).join("/")}`;
      crumbs.push({ label, href });
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl items-center gap-2 px-6 py-3 text-sm text-[#f3e9dc]">
      <Link
        href="/main"
        className="inline-flex items-center gap-2 rounded-full border border-[#d2b48c] bg-[#8b6b4a] px-3 py-2 transition hover:bg-[#9c7654]"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only">Home</span>
      </Link>

      {crumbs.map((crumb, index) => (
        <div key={`${crumb.href}-${index}`} className="inline-flex items-center gap-2">
          <span className="text-[#f3e9dc]">›</span>
          <Link href={crumb.href} className="transition hover:text-white">
            {crumb.label}
          </Link>
        </div>
      ))}
    </div>
  );
}
