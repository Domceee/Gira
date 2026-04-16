"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { ChevronDown } from "lucide-react";

interface RetroData {
  start_doing: string[];
  stop_doing: string[];
  continue_doing: string[];
}

interface Sprint {
  id_sprint: number;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
}

export default function LastRetrospective({
  teamId,
  projectId,
}: {
  teamId: string | number;
  projectId: string | number;
}) {
  const [loading, setLoading] = useState(true);
  const [retro, setRetro] = useState<RetroData | null>(null);
  const [sprintId, setSprintId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(true); // ⭐ collapsible state

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const sprints: Sprint[] = await apiFetch(
          `/api/sprints?team_id=${teamId}`,
          { cache: "no-store" }
        ).then((r) => r.json());

        const lastCompleted = [...sprints]
          .filter((s) => s.status === "COMPLETED")
          .sort((a, b) => b.id_sprint - a.id_sprint)[0];

        if (!lastCompleted) {
          setError("No completed sprints yet.");
          return;
        }

        setSprintId(lastCompleted.id_sprint);

        const retroRes = await apiFetch(
          `/api/sprints/${lastCompleted.id_sprint}/retrospective`,
          { method: "GET" }
        );

        if (!retroRes.ok) {
          setError("Failed to load retrospective.");
          return;
        }

        const data = await retroRes.json();
        setRetro(data.retrospective_data || null);
      } catch {
        setError("Unable to load retrospective.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [teamId]);

  return (
    <div className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-6 shadow-md mb-10">

      {/* Header with toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left"
      >
        <h2 className="text-2xl font-bold text-[#5c3b28]">
          Last Sprint Retrospective
        </h2>

        <ChevronDown
          className={`h-6 w-6 text-[#5c3b28] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Collapsible content */}
      <div
        className={`transition-all overflow-hidden ${
          open ? "max-h-[2000px] mt-6" : "max-h-0"
        }`}
      >
        {loading && <p className="text-[#6f4e37]">Loading...</p>}
        {error && <p className="text-[#6f4e37]">{error}</p>}

        {!loading && !error && retro && (
          <>
            <p className="text-sm text-[#6f4e37] mb-6">
              From sprint <span className="font-semibold">{sprintId}</span>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <RetroColumn title="Start Doing" items={retro.start_doing} />
              <RetroColumn title="Stop Doing" items={retro.stop_doing} />
              <RetroColumn title="Continue Doing" items={retro.continue_doing} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RetroColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-[#d9c1a7] bg-[#fffaf5] p-4 shadow-sm">
      <h3 className="text-xl font-bold text-[#5c3b28] mb-3">{title}</h3>

      {items.length === 0 ? (
        <p className="text-[#6f4e37] text-sm">No items.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li
              key={i}
              className="rounded-lg border border-[#c8a27a] bg-white p-2 text-[#4b2e1f]"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
