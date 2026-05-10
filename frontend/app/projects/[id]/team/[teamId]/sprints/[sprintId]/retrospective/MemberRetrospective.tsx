"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  loadMemberRetrospective,
  saveMemberRetrospective,
  submitMemberRetrospective,
} from "./actions";

type RetroField = "good" | "bad" | "continue";

interface RetroData {
  good: string[];
  bad: string[];
  continue: string[];
}

const STEPS: { field: RetroField; question: string; placeholder: string }[] = [
  { field: "good", question: "What went well this sprint?", placeholder: "Something that worked great..." },
  { field: "bad", question: "What could be improved?", placeholder: "Something that was frustrating..." },
  { field: "continue", question: "What should we continue doing?", placeholder: "Something worth keeping..." },
];

function emptyRetro(): RetroData {
  return { good: [""], bad: [""], continue: [""] };
}

function normalize(arr?: string[], locked?: boolean): string[] {
  if (!Array.isArray(arr) || arr.length === 0) return locked ? [] : [""];
  const cleaned = arr.filter((x) => x.trim() !== "");
  return locked ? cleaned : [...cleaned, ""];
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
  const [step, setStep] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [retro, setRetro] = useState<RetroData>(emptyRetro());

  const editingLocked = isSubmitted || sprintFinished;

  useEffect(() => {
    (async () => {
      const existing = await loadMemberRetrospective({ projectId, teamId, sprintId });
      if (!existing) return;

      if (existing.is_submitted) setIsSubmitted(true);
      if (!existing.description) return;

      let parsed: any;
      try {
        parsed = JSON.parse(existing.description);
      } catch {
        return;
      }

      setRetro({
        good: normalize(parsed.good, existing.is_submitted),
        bad: normalize(parsed.bad, existing.is_submitted),
        continue: normalize(parsed.continue, existing.is_submitted),
      });
    })();
  }, [projectId, teamId, sprintId]);

  function updateItem(field: RetroField, index: number, value: string) {
    setRetro((prev) => {
      const col = [...prev[field]];
      col[index] = value;
      const cleaned = col.filter((x, i) => x.trim() !== "" || i === col.length - 1);
      if (cleaned[cleaned.length - 1].trim() !== "") cleaned.push("");
      return { ...prev, [field]: cleaned };
    });
  }

  function removeItem(field: RetroField, index: number) {
    setRetro((prev) => {
      const col = prev[field].filter((_, i) => i !== index);
      return { ...prev, [field]: col.length === 0 ? [""] : col };
    });
  }

  async function saveDraft() {
    setIsSaving(true);
    try {
      const cleaned = {
        good: retro.good.filter((x) => x.trim() !== ""),
        bad: retro.bad.filter((x) => x.trim() !== ""),
        continue: retro.continue.filter((x) => x.trim() !== ""),
      };
      await saveMemberRetrospective({ projectId, teamId, sprintId, retro: cleaned });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleNext() {
    await saveDraft();
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function handleSubmit() {
    if (!window.confirm("Submit your retrospective? You won't be able to edit it afterwards.")) return;
    await saveDraft();
    await submitMemberRetrospective({ projectId, teamId, sprintId });
    setIsSubmitted(true);
  }

  const currentStep = STEPS[step];
  const items = retro[currentStep.field];

  return (
    <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-lg font-semibold text-[#edf3fb] mb-4"
      >
        {open ? <ChevronDown /> : <ChevronRight />}
        Your Retrospective
        {isSubmitted && (
          <span className="ml-2 text-xs font-normal text-green-400">✓ Submitted</span>
        )}
      </button>

      {open && (
        <>
          {/* SUBMITTED — read-only summary */}
          {isSubmitted ? (
            <div className="space-y-5">
              {STEPS.map((s) => {
                const entries = retro[s.field].filter((x) => x.trim() !== "");
                return (
                  <div key={s.field}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">
                      {s.question}
                    </div>
                    {entries.length === 0 ? (
                      <p className="text-xs italic text-[#667386]">Nothing noted.</p>
                    ) : (
                      <ul className="space-y-1">
                        {entries.map((item, i) => (
                          <li key={i} className="flex gap-2 text-sm text-[#edf3fb]">
                            <span className="text-[#39e7ac]">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          ) : sprintFinished ? (
            <div className="py-4 text-center text-xs font-semibold text-yellow-400">
              Sprint retrospective is finished. Editing is locked.
            </div>
          ) : (
            /* WIZARD */
            <>
              {/* Step indicator */}
              <div className="mb-6 flex items-center justify-center gap-2">
                {STEPS.map((s, i) => (
                  <div key={s.field} className="flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                        i < step
                          ? "border-[#39e7ac] bg-[#39e7ac] text-[#1f2630]"
                          : i === step
                          ? "border-[#39e7ac] text-[#39e7ac]"
                          : "border-[#7a8798] text-[#7a8798]"
                      }`}
                    >
                      {i < step ? "✓" : i + 1}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`h-0.5 w-8 transition-colors ${i < step ? "bg-[#39e7ac]" : "bg-[#7a8798]"}`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Question */}
              <h3 className="mb-4 text-base font-semibold text-[#edf3fb]">
                {currentStep.question}
              </h3>

              {/* Input list */}
              <div className="mb-6 space-y-2">
                {items.map((value, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm text-[#39e7ac]">•</span>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateItem(currentStep.field, index, e.target.value)}
                      placeholder={index === items.length - 1 ? currentStep.placeholder : ""}
                      className="flex-1 rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-2 text-sm text-[#edf3fb] outline-none transition placeholder:text-[#667386] focus:border-[rgba(57,231,172,0.40)]"
                    />
                    {value.trim() !== "" && (
                      <button
                        onClick={() => removeItem(currentStep.field, index)}
                        className="px-1 text-[#667386] hover:text-[#ff8080]"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                {step > 0 ? (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    className="rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#edf3fb] hover:bg-[#323d4b]"
                  >
                    ← Back
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    onClick={saveDraft}
                    disabled={isSaving}
                    className="rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#c3ceda] hover:bg-[#323d4b] disabled:opacity-50"
                  >
                    {isSaving ? "Saving…" : "Save Draft"}
                  </button>

                  {step < STEPS.length - 1 ? (
                    <button
                      onClick={handleNext}
                      disabled={isSaving}
                      className="rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#39e7ac] hover:bg-[rgba(57,231,172,0.20)] disabled:opacity-50"
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={isSaving}
                      className="rounded-lg border border-green-600 bg-green-700/40 px-4 py-2 text-xs font-bold uppercase tracking-widest text-green-400 hover:bg-green-700/60 disabled:opacity-50"
                    >
                      Submit Final
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
