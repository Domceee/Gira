"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type Team = { id_team: number; name: string | null };
type Project = { id: number; name: string | null };

type Props = {
  projectId: string;
  projectName: string | null;
  isOwner: boolean;
  projects: Project[];
  teams: Team[];
};

function getInitials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProjectSidebar({ projectId, projectName, isOwner, projects, teams }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [projectOpen, setProjectOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [user, setUser] = useState<{ name: string | null; picture?: string | null } | null>(null);
  const projectDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/proxy/auth/me", { credentials: "include", cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setUser({ name: d.name, picture: d.picture }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (projectDropRef.current && !projectDropRef.current.contains(e.target as Node)) {
        setProjectOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  const navLink = (href: string, label: string, icon: React.ReactNode, exact = false) => (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        (exact ? pathname === href : isActive(href))
          ? "bg-[rgba(57,231,172,0.16)] text-[#39e7ac]"
          : "text-[#edf3fb] hover:bg-[#323d4b] hover:text-[#ffffff]"
      }`}
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <aside className="flex h-screen w-52 shrink-0 flex-col border-r border-[#667386] bg-[#1f2630]">
      {/* Logo */}
      <div className="flex h-12 items-center border-b border-[#667386] px-4">
        <Link href="/main" className="flex items-center gap-2">
          <Image src="/favicon.ico" alt="Gira" width={22} height={22} className="rounded" />
          <span className="text-[#39e7ac] font-bold tracking-widest text-[0.95rem] uppercase">Gira</span>
        </Link>
      </div>

      {/* Project switcher */}
      <div className="relative px-3 py-3 border-b border-[#667386]" ref={projectDropRef}>
        <button
          onClick={() => setProjectOpen(!projectOpen)}
          className="flex w-full items-center justify-between rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-2 text-left text-sm font-medium text-[#ffffff] hover:border-[#7b8798] hover:bg-[#323d4b] transition-colors"
        >
          <span className="truncate">{projectName ?? "Project"}</span>
          <svg className={`h-3.5 w-3.5 shrink-0 text-[#c3ceda] transition-transform ${projectOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {projectOpen && (
          <div className="absolute left-3 right-3 top-full z-50 mt-1 rounded-lg border border-[#7a8798] bg-[#28313d] shadow-xl overflow-hidden">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                onClick={() => setProjectOpen(false)}
                className={`block truncate px-3 py-2.5 text-sm transition-colors ${
                  String(p.id) === projectId
                    ? "bg-[rgba(57,231,172,0.13)] text-[#39e7ac]"
                    : "text-[#f7faff] hover:bg-[#323d4b] hover:text-[#ffffff]"
                }`}
              >
                {p.name ?? "Unnamed"}
              </Link>
            ))}
            <div className="border-t border-[#667386]">
              <Link
                href="/projectNew"
                onClick={() => setProjectOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-[#c3ceda] hover:bg-[#323d4b] hover:text-[#ffffff] transition-colors"
              >
                <span className="text-[#39e7ac]">+</span> New project
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5 px-2 py-3 border-b border-[#667386]">
        {navLink(
          `/projects/${projectId}/board`,
          "Board",
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>
        )}
        {navLink(
          `/projects/${projectId}/backlog`,
          "Backlog",
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10"/></svg>
        )}
        {navLink(
          `/projects/${projectId}`,
          "Stats",
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l4-4 3 3 5-7"/></svg>,
          true
        )}
      </nav>

      {/* Teams */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {teams.length > 0 && (
          <>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-widest text-[#a3b0c2]">Teams</p>
            <div className="flex flex-col gap-0.5">
              {teams.map((team) => {
                const href = `/projects/${projectId}/team/${team.id_team}`;
                return (
                  <Link
                    key={team.id_team}
                    href={href}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                      pathname.startsWith(href)
                        ? "bg-[rgba(57,231,172,0.16)] text-[#39e7ac]"
                        : "text-[#edf3fb] hover:bg-[#323d4b] hover:text-[#ffffff]"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${pathname.startsWith(href) ? "bg-[#39e7ac]" : "bg-[#93a0b1]"}`} />
                    <span className="truncate">{team.name ?? `Team ${team.id_team}`}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col gap-0.5 border-t border-[#667386] px-2 py-3">
        {isOwner && navLink(
          `/projects/${projectId}/manageProject`,
          "Settings",
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>
        )}
        {isOwner && navLink(
          `/projects/${projectId}/manageTeam`,
          "Manage Teams",
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        )}
      </div>

      {/* User */}
      <div className="border-t border-[#667386] px-3 py-3">
        <div className="flex items-center justify-between gap-2">
            <Link href="/profile" className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
                {user && user.picture ? (
                    <img
                        src={"data:image/jpeg;base64," + user.picture}
                        alt="Profile"
                        className="h-7 w-7 rounded-full object-cover border border-[#7b8798]"
                    />
                ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7a8798] text-xs font-semibold text-[#39e7ac] border border-[#7b8798]">
                        {getInitials(user ? user.name : null)}
                    </div>
                )}
                <span className="truncate text-sm text-[#edf3fb]">{user ? user.name : "Profile"}</span>
            </Link>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            title="Logout"
            className="shrink-0 rounded p-1 text-[#c3ceda] hover:text-[#ffffff] transition-colors disabled:opacity-40"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

