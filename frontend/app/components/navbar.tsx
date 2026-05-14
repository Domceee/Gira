"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface User {
  id_user: number;
  name: string;
  email: string;
  country: string;
  city: string;
  picture?: string | null; 
}

export default function Navbar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const res = await fetch(`/api/proxy/auth/me`, { method: "GET", credentials: "include", cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setUser(data);
      } catch {}
    }
    fetchCurrentUser();
  }, []);

  function getInitials(name?: string) {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);
      const res = await fetch(`/api/auth/logout`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Logout failed");
      setOpen(false);
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch {
      alert("Failed to log out.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <nav className="w-full border-b border-[#667386] bg-[#1f2630] text-[#ffffff]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/main" className="flex items-center gap-3">
          <Image src="/gira-logo.svg" alt="Gira" width={40} height={40} className="rounded" />
          <span className="text-[#39e7ac] font-bold tracking-widest text-sm uppercase">Gira</span>
          <span className="text-xs text-[#c3ceda]">Project Management</span>
        </Link>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-2 transition hover:border-[#7b8798] hover:bg-[#323d4b]"
          >
              {user?.picture ? (
                <img
                  src={`data:image/jpeg;base64,${user.picture}`}
                  alt="Profile"
                  className="h-7 w-7 rounded-full object-cover border border-[#7b8798]"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7a8798] text-xs font-semibold text-[#39e7ac] border border-[#7b8798]">
                  {getInitials(user?.name)}
                </div>
              )}

            <svg className={`h-3.5 w-3.5 text-[#c3ceda] transition ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-lg border border-[#7a8798] bg-[#28313d] shadow-xl">
              <Link href="/profile" className="block px-4 py-3 text-sm text-[#f7faff] hover:bg-[#323d4b] hover:text-[#ffffff]" onClick={() => setOpen(false)}>
                Profile
              </Link>
              <button
                className="w-full px-4 py-3 text-left text-sm text-[#f7faff] hover:bg-[#323d4b] hover:text-[#ffffff] disabled:opacity-50"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

