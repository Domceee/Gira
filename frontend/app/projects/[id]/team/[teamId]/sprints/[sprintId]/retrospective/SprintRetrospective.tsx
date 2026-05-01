"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { loadRetrospective, saveRetrospective, toggleRetrospective } from "./actions";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
type RetroColumn = "good" | "bad" | "ideas" | "actions";

interface RetroData {
  good: string[];
  bad: string[];
  ideas: string[];
  actions: string[];
}

export default function SprintRetrospective({ projectId, teamId, sprintId }: any) {
  const [open, setOpen] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const [retro, setRetro] = useState<RetroData>({
    good: [""],
    bad: [""],
    ideas: [""],
    actions: [""],
  });

  const normalize = (arr?: string[], finished?: boolean) => {
    if (!Array.isArray(arr)) return [""];
    const cleaned = arr.filter((x) => x.trim() !== "");
    if (finished) return cleaned.length ? cleaned : [""];
    return [...cleaned, ""];
  };

  useEffect(() => {
    (async () => {
      const existing = await loadRetrospective({ projectId, teamId, sprintId });
      if (!existing || !existing.text) return;

      const finished = existing.is_finished === true;
      setIsFinished(finished);

      let parsed: RetroData;
      try {
        const raw = JSON.parse(existing.text);
        parsed = raw.retro ?? raw;
      } catch {
        parsed = { good: [""], bad: [""], ideas: [""], actions: [""] };
      }

      setRetro({
        good: normalize(parsed.good, finished),
        bad: normalize(parsed.bad, finished),
        ideas: normalize(parsed.ideas, finished),
        actions: normalize(parsed.actions, finished),
      });
    })();
  }, [projectId, teamId, sprintId]);

  const updateCell = (column: RetroColumn, index: number, value: string) => {
    if (isFinished || isLoadingAI) return;

    setRetro((prev) => {
      const next = { ...prev };
      let col = [...next[column]];
      col[index] = value;
      col = col.filter((x, i) => x.trim() !== "" || i === col.length - 1);
      if (col[col.length - 1].trim() !== "") col.push("");
      next[column] = col;
      return next;
    });
  };

  const columns: RetroColumn[] = ["good", "bad", "ideas", "actions"];
  const thClass = "p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#c3ceda] bg-[#28313d]";
  const tdClass = "p-3 text-sm text-[#edf3fb]";

  return (
    <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-6">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-lg font-semibold text-[#edf3fb] mb-4">
        {open ? <ChevronDown /> : <ChevronRight />}
        Sprint Retrospective
      </button>

      {open && (
        <>
          <div className="overflow-x-auto">
          <div className="grid grid-cols-4 gap-4 min-w-full">
            {columns.map((col) => (
              <div key={col} className="min-w-[200px]">
                <div className={thClass}>{col.toUpperCase()}</div>

                {retro[col].map((value, index) => (
                  <div
                    key={index}
                    contentEditable={!isFinished && !isLoadingAI}
                    suppressContentEditableWarning
                    onBlur={(e) => updateCell(col, index, (e.target as HTMLDivElement).textContent || "")}
                    className={`p-3 text-xs text-[#edf3fb] bg-[#1f2630] border-b border-[#3a4552] whitespace-pre-wrap break-words min-h-[40px] rounded ${
                      isFinished || isLoadingAI ? "opacity-50 cursor-not-allowed" : "cursor-text hover:bg-[#252e39]"
                    }`}
                  >
                    {value}
                  </div>
                ))}
              </div>
            ))}
          </div>
          </div>

          
          <div className="mt-8 space-y-4">
             {!isFinished && (
                <button
                  disabled={isLoadingAI}
                  onClick={async () => {
                    setIsLoadingAI(true);
                    try {
                      const res = await fetch(`${API_URL}/api/retrospective/summarize`, {
                        method: "POST",
                        credentials: "include",
                        body: JSON.stringify({ projectId, teamId, sprintId }),
                        headers: { "Content-Type": "application/json" },
                      });

                      const summary = await res.json();
                      console.log("AI SUMMARY RAW:", summary);

                      // Normalize to guarantee arrays
                      const safe = {
                        good: Array.isArray(summary.good) ? summary.good : [],
                        bad: Array.isArray(summary.bad) ? summary.bad : [],
                        ideas: Array.isArray(summary.ideas) ? summary.ideas : [],
                        actions: Array.isArray(summary.actions) ? summary.actions : [],
                      };

                      const newRetro = {
                        good: [...safe.good, ""],
                        bad: [...safe.bad, ""],
                        ideas: [...safe.ideas, ""],
                        actions: [...safe.actions, ""],
                      };

                      setRetro(newRetro);

                      // Auto-save the AI summary
                      const cleaned = {
                        good: newRetro.good.filter((x) => x.trim() !== ""),
                        bad: newRetro.bad.filter((x) => x.trim() !== ""),
                        ideas: newRetro.ideas.filter((x) => x.trim() !== ""),
                        actions: newRetro.actions.filter((x) => x.trim() !== ""),
                      };

                      const fd = new FormData();
                      fd.append("sprint_id", sprintId);
                      fd.append("team_id", teamId);
                      fd.append("project_id", projectId);
                      fd.append("retro", JSON.stringify(cleaned));

                      await saveRetrospective(fd);
                    } finally {
                      setIsLoadingAI(false);
                    }
                  }}
                  className={`w-full rounded-lg border border-[#7a8798] px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                    isLoadingAI
                      ? "bg-[#323d4b] text-[#888] cursor-not-allowed"
                      : "bg-[#28313d] text-[#edf3fb] hover:bg-[#323d4b]"
                  }`}
                >
                  {isLoadingAI ? "Summarizing..." : "Summarize with AI"}
                </button>
              )}
            {!isFinished && (
              <button
                disabled={isLoadingAI}
                onClick={async () => {
                  const cleaned = {
                    good: retro.good.filter((x) => x.trim() !== ""),
                    bad: retro.bad.filter((x) => x.trim() !== ""),
                    ideas: retro.ideas.filter((x) => x.trim() !== ""),
                    actions: retro.actions.filter((x) => x.trim() !== ""),
                  };

                  const fd = new FormData();
                  fd.append("sprint_id", sprintId);
                  fd.append("team_id", teamId);
                  fd.append("project_id", projectId);
                  fd.append("retro", JSON.stringify(cleaned));

                  await saveRetrospective(fd);
                }}
                className={`w-full rounded-lg border border-[#7a8798] px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                  isLoadingAI
                    ? "bg-[#323d4b] text-[#888] cursor-not-allowed"
                    : "bg-[#28313d] text-[#edf3fb] hover:bg-[#323d4b]"
                }`}
              >
                Save Retrospective
              </button>
            )}

            <button
              disabled={isLoadingAI}
              onClick={async () => {
                const message = isFinished
                  ? "Reopen this retrospective?"
                  : "Finish this retrospective and lock editing?";
                if (!window.confirm(message)) return;

                const result = await toggleRetrospective({ sprintId, teamId, projectId });
                setIsFinished(result.is_finished);
              }}
              className={`w-full rounded-lg border border-[#7a8798] px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                isLoadingAI
                  ? "bg-[#323d4b] text-[#888] cursor-not-allowed"
                  : "bg-[#28313d] text-[#edf3fb] hover:bg-[#323d4b]"
              }`}
            >
              {isFinished ? "Reopen Retrospective" : "Finish Retrospective"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
