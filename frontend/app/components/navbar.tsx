"use client";
import Image from "next/image";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="w-full border-b border-[#8b6b4a] bg-[#6f4e37] text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Company Logo"
            width={60}
            height={60}
            className="rounded-full object-contain"
            />
          <div>
            <h1 className="text-xl font-bold tracking-wide">Gira</h1>
            <p className="text-xs text-[#f3e9dc]">Itteration Project Management System</p>
          </div>
        </Link>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-3 rounded-full border border-[#d2b48c] bg-[#8b6b4a] px-3 py-2 transition hover:bg-[#9c7654]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3e9dc] font-semibold text-[#5c3b28]">
              U
            </div>
            <span className="hidden text-sm font-medium sm:block">Profile</span>
            <svg
              className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 mt-3 w-44 overflow-hidden rounded-xl border border-[#c8a27a] bg-white shadow-lg">
              <Link
                href="/profile"
                className="block px-4 py-3 text-sm text-[#4b2e1f] hover:bg-[#f5ede3]"
              >
                View Profile
              </Link>
              <button
                className="w-full px-4 py-3 text-left text-sm text-[#4b2e1f] hover:bg-[#f5ede3]"
                onClick={() => alert("Connect this to your logout logic later")}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}