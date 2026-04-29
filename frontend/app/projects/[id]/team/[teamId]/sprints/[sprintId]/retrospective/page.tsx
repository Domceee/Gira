"use client";

import { use, useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  loadRetrospective,
  saveRetrospective,
  toggleRetrospective,
  loadMemberRetrospective,
  saveMemberRetrospective,
} from "./actions";

type RetroColumn = "good" | "bad" | "ideas" | "actions";

interface RetroData {
  good: string[];
  bad: string[];
  ideas: string[];
  actions: string[];
}

export default function RetrospectivePage({
  params,
}: {
  params: Promise<{ projectId: string; teamId: string; sprintId: string }>;
}) {
  const { projectId, teamId, sprintId } = use(params);

  const [open, setOpen] = useState(true);
  const [isFinished, setIsFinished] = useState(false);

  const [retro, setRetro] = useState<RetroData>({
    good: [""],
    bad: [""],
    ideas: [""],
    actions: [""],
  });


  
  /* ---------------------------------------------------------
     NORMALIZE FUNCTION (only adds empty row when not finished)
  --------------------------------------------------------- */
  const normalize = (arr?: string[], finished?: boolean) => {
    if (!Array.isArray(arr)) return [];

    const cleaned = arr.filter((x) => x.trim() !== "");

    if (finished) return cleaned; // no empty row

    return [...cleaned, ""]; // one empty row when editing
  };

  /* ---------------------------------------------------------
     LOAD EXISTING RETROSPECTIVE
  --------------------------------------------------------- */
  useEffect(() => {
    (async () => {
      const existing = await loadRetrospective({
        projectId,
        teamId,
        sprintId,
      });

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

      const nextState: RetroData = {
        good: normalize(parsed.good, finished),
        bad: normalize(parsed.bad, finished),
        ideas: normalize(parsed.ideas, finished),
        actions: normalize(parsed.actions, finished),
      };

      setRetro(nextState);
    })();
  }, [projectId, teamId, sprintId]);
    // Re-normalize rows when finished state changes
    useEffect(() => {
    setRetro((prev) => ({
        good: normalize(prev.good, isFinished),
        bad: normalize(prev.bad, isFinished),
        ideas: normalize(prev.ideas, isFinished),
        actions: normalize(prev.actions, isFinished),
    }));
    }, [isFinished]);


  /* ---------------------------------------------------------
     UPDATE CELL (only adds empty row when not finished)
  --------------------------------------------------------- */
  const updateCell = (column: RetroColumn, index: number, value: string) => {
    if (isFinished) return;

    setRetro((prev) => {
      const next = { ...prev };
      let col = [...next[column]];

      col[index] = value;

      // Remove all empty rows except last
      col = col.filter((x, i) => x.trim() !== "" || i === col.length - 1);

      // If last row is filled → add empty row
      if (col[col.length - 1].trim() !== "") {
        col.push("");
      }

      next[column] = col;
      return next;
    });
  };

  const thClass =
    "p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#c3ceda] bg-[#28313d]";
  const tdClass = "p-3 text-sm text-[#edf3fb]";
  const columns: RetroColumn[] = ["good", "bad", "ideas", "actions"];

// ---------------------------------------------------------
// PERSONAL RETROSPECTIVE (TEAM MEMBER ONLY)
// ---------------------------------------------------------

const [memberOpen, setMemberOpen] = useState(true);
const [memberDescription, setMemberDescription] = useState("");
const [isMemberVisible, setIsMemberVisible] = useState(false);

useEffect(() => {
  (async () => {
    const existing = await loadMemberRetrospective({
      projectId,
      teamId,
      sprintId,
    });

    if (!existing) {
      // User is NOT a team member → hide section
      setIsMemberVisible(false);
      return;
    }

    setIsMemberVisible(true);
    setMemberDescription(existing.description || "");
  })();
}, [projectId, teamId, sprintId]);





  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */
  return (
    <div className="space-y-8 p-6">
         {/* Personal retrospective  */}
        {isMemberVisible && (
        <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-6 mt-10">
            <button
            onClick={() => setMemberOpen(!memberOpen)}
            className="flex items-center gap-2 text-lg font-semibold text-[#edf3fb] mb-4"
            >
            {memberOpen ? <ChevronDown /> : <ChevronRight />}
            Your Personal Retrospective
            </button>

            {memberOpen && (
            <>
                <textarea
                value={memberDescription}
                onChange={(e) => setMemberDescription(e.target.value)}
                className="w-full resize-none rounded bg-[#28313d] p-3 text-sm text-[#edf3fb] outline-none min-h-[120px]"
                />

                <button
                onClick={async () => {
                    const fd = new FormData();
                    fd.append("sprint_id", sprintId);
                    fd.append("team_id", teamId);
                    fd.append("description", memberDescription);
                    fd.append("project_id", projectId);
                    await saveMemberRetrospective(fd);
                }}
                className="mt-4 w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#edf3fb] hover:bg-[#323d4b]"
                >
                Save Personal Retrospective
                </button>
            </>
            )}
        </div>
        )}

        {/* Sprint retrospective  */}
      <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-6">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-lg font-semibold text-[#edf3fb] mb-4"
        >
          {open ? <ChevronDown /> : <ChevronRight />}
          Sprint Retrospective
        </button>

        {open && (
          <>
            {/* TABLE */}
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
                        className={`w-full resize-none rounded bg-[#28313d] p-2 text-xs text-[#edf3fb] outline-none overflow-hidden ${
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

            {/* ACTION BUTTONS */}
            <div className="mt-8 space-y-4">

              {/* SAVE BUTTON */}
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

              {/* TOGGLE FINISH / REOPEN */}
              <button
                onClick={async () => {
                  const message = isFinished
                    ? "Reopen this retrospective so it becomes editable again?"
                    : "Finish this retrospective and lock all editing?";

                  if (!window.confirm(message)) return;

                  const result = await toggleRetrospective({
                    sprintId,
                    teamId,
                    projectId,
                  });

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
    </div>
  );
}
