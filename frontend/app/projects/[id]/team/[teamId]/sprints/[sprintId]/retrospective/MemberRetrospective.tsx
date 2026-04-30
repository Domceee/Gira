"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  loadMemberRetrospective,
  saveMemberRetrospective,
  submitMemberRetrospective,
} from "./actions";

type RetroColumn = "good" | "bad" | "ideas" | "actions";

interface RetroData {
  good: string[];
  bad: string[];
  ideas: string[];
  actions: string[];
}

export default function MemberRetrospective({
  projectId,
  teamId,
  sprintId,
  sprintFinished,
}: {
  projectId: string;
  teamId: string;
  sprintId: string;
  sprintFinished: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);

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

  // 🔥 Unified lock: sprint finished OR user submitted
  const editingLocked = isSubmitted || sprintFinished;

  /* ---------------------------------------------------------
     LOAD EXISTING PERSONAL RETRO
  --------------------------------------------------------- */
  useEffect(() => {
    (async () => {
      const existing = await loadMemberRetrospective({
        projectId,
        teamId,
        sprintId,
      });

      if (!existing) return;

      if (existing.is_submitted === true) {
        setIsSubmitted(true);
      }

      if (!existing.description) return;

      let parsed: RetroData;
      try {
        parsed = JSON.parse(existing.description);
      } catch {
        parsed = { good: [""], bad: [""], ideas: [""], actions: [""] };
      }

      setRetro({
        good: normalize(parsed.good, existing.is_submitted),
        bad: normalize(parsed.bad, existing.is_submitted),
        ideas: normalize(parsed.ideas, existing.is_submitted),
        actions: normalize(parsed.actions, existing.is_submitted),
      });
    })();
  }, [projectId, teamId, sprintId]);

  /* ---------------------------------------------------------
     UPDATE CELL
  --------------------------------------------------------- */
  const updateCell = (column: RetroColumn, index: number, value: string) => {
    if (editingLocked) return;

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
  const thClass =
    "p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#c3ceda] bg-[#28313d]";
  const tdClass = "p-3 text-sm text-[#edf3fb]";

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */
  return (
    <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-lg font-semibold text-[#edf3fb] mb-4"
      >
        {open ? <ChevronDown /> : <ChevronRight />}
        Your Personal Retrospective
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
                      disabled={editingLocked}
                      value={value}
                      onChange={(e) =>
                        updateCell(col, index, e.target.value)
                      }
                      className={`w-full resize-none rounded bg-[#28313d] p-2 text-xs text-[#edf3fb] outline-none ${
                        editingLocked ? "opacity-50 cursor-not-allowed" : ""
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

          {/* BUTTONS */}
          <div className="mt-4 space-y-3">

            {/* SAVE DRAFT */}
            {!editingLocked && (
              <button
                onClick={async () => {
                  const cleaned = {
                    good: retro.good.filter((x) => x.trim() !== ""),
                    bad: retro.bad.filter((x) => x.trim() !== ""),
                    ideas: retro.ideas.filter((x) => x.trim() !== ""),
                    actions: retro.actions.filter((x) => x.trim() !== ""),
                  };

                  await saveMemberRetrospective({
                    projectId,
                    teamId,
                    sprintId,
                    retro: cleaned,
                  });
                }}
                className="w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#edf3fb] hover:bg-[#323d4b]"
              >
                Save Draft
              </button>
            )}

            {/* SUBMIT FINAL */}
            {!editingLocked && (
              <button
                onClick={async () => {
                  if (
                    !window.confirm(
                      "Submit your retrospective? You won't be able to edit it afterwards."
                    )
                  )
                    return;

                  await submitMemberRetrospective({
                    projectId,
                    teamId,
                    sprintId,
                  });

                  setIsSubmitted(true);
                }}
                className="w-full rounded-lg border border-green-600 bg-green-700 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-green-800"
              >
                Submit Final
              </button>
            )}

            {/* STATUS MESSAGES */}
            <div className="space-y-2">
              {isSubmitted && (
                <div className="text-center text-green-400 text-xs font-semibold">
                  Your retrospective has been submitted.
                </div>
              )}

              {sprintFinished && (
                <div className="text-center text-yellow-400 text-xs font-semibold">
                  Sprint retrospective is finished. Editing is locked.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
