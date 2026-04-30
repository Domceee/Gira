"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { loadRetrospective, saveRetrospective, toggleRetrospective } from "./actions";

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
    if (isFinished) return;

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
          <div className="grid grid-cols-4 gap-4">
            {columns.map((col) => (
              <div key={col}>
                <div className={thClass}>{col.toUpperCase()}</div>

                {retro[col].map((value, index) => (
                  <div key={index} className={tdClass}>
                    <textarea
                      disabled={isFinished}
                      value={value}
                      onChange={(e) => updateCell(col, index, e.target.value)}
                      className={`w-full resize-none rounded bg-[#28313d] p-2 text-xs text-[#edf3fb] outline-none ${
                        isFinished ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      rows={1}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "auto";
                        target.style.height = `${target.scrollHeight}px`;
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-4">
            {!isFinished && (
              <button
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
                className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#edf3fb] hover:bg-[#323d4b]"
              >
                Save Retrospective
              </button>
            )}

            <button
              onClick={async () => {
                const message = isFinished
                  ? "Reopen this retrospective?"
                  : "Finish this retrospective and lock editing?";
                if (!window.confirm(message)) return;

                const result = await toggleRetrospective({ sprintId, teamId, projectId });
                setIsFinished(result.is_finished);
              }}
              className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#edf3fb] hover:bg-[#323d4b]"
            >
              {isFinished ? "Reopen Retrospective" : "Finish Retrospective"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
