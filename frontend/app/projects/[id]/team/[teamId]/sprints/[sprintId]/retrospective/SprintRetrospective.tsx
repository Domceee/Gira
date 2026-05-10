"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  loadRetrospective,
  saveRetrospective,
  toggleRetrospective,
  summarizeRetrospective,
} from "./actions";

interface ActionBlock {
  id: number;
  text: string;
}

function parseActions(text: string): ActionBlock[] {
  try {
    const raw = JSON.parse(text);
    const arr: string[] = Array.isArray(raw.actions) ? raw.actions : [];
    return arr.map((t, i) => ({ id: i + 1, text: t }));
  } catch {
    return [];
  }
}

let nextId = 1000;

export default function SprintRetrospective({
  projectId,
  teamId,
  sprintId,
  isOwner,
}: {
  projectId: string;
  teamId: string;
  sprintId: string;
  isOwner: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actions, setActions] = useState<ActionBlock[]>([]);

  useEffect(() => {
    (async () => {
      const existing = await loadRetrospective({ projectId, teamId, sprintId });
      if (!existing) return;
      setIsFinished(existing.is_finished === true);
      if (existing.text) {
        setActions(parseActions(existing.text));
      }
    })();
  }, [projectId, teamId, sprintId]);

  function updateAction(id: number, text: string) {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, text } : a)));
  }

  function removeAction(id: number) {
    setActions((prev) => prev.filter((a) => a.id !== id));
  }

  function addAction() {
    setActions((prev) => [...prev, { id: nextId++, text: "" }]);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.append("sprint_id", sprintId);
      fd.append("team_id", teamId);
      fd.append("project_id", projectId);
      fd.append(
        "retro",
        JSON.stringify({ actions: actions.map((a) => a.text).filter((t) => t.trim() !== "") })
      );
      await saveRetrospective(fd);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const summary = await summarizeRetrospective({ projectId, teamId, sprintId });
      const generated: ActionBlock[] = (summary.actions as string[]).map((t) => ({
        id: nextId++,
        text: t,
      }));
      setActions(generated);

      // Auto-save after generation
      const fd = new FormData();
      fd.append("sprint_id", sprintId);
      fd.append("team_id", teamId);
      fd.append("project_id", projectId);
      fd.append("retro", JSON.stringify({ actions: generated.map((a) => a.text) }));
      await saveRetrospective(fd);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleToggle() {
    const message = isFinished
      ? "Reopen this retrospective for editing?"
      : "Finish this retrospective and lock editing?";
    if (!window.confirm(message)) return;
    await handleSave();
    const result = await toggleRetrospective({ sprintId, teamId, projectId });
    setIsFinished(result.is_finished);
  }

  return (
    <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-lg font-semibold text-[#edf3fb] mb-4"
      >
        {open ? <ChevronDown /> : <ChevronRight />}
        Sprint Retrospective — Actions
        {isFinished && (
          <span className="ml-2 text-xs font-normal text-green-400">✓ Finished</span>
        )}
      </button>

      {open && (
        <>
          {/* Generate button — owner only */}
          {isOwner && !isFinished && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating || isSaving}
              className="mb-6 w-full rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-[#39e7ac] hover:bg-[rgba(57,231,172,0.20)] disabled:opacity-50"
            >
              {isGenerating ? "Generating…" : "Generate Actions with AI"}
            </button>
          )}

          {/* Action blocks */}
          {actions.length === 0 ? (
            <p className="mb-4 text-center text-xs italic text-[#667386]">
              {isOwner ? "No actions yet. Generate with AI or add one manually." : "No actions have been added yet."}
            </p>
          ) : (
            <div className="mb-4 space-y-3">
              {actions.map((action, idx) => (
                <div key={action.id} className="flex items-start gap-3">
                  <span className="mt-2.5 min-w-[20px] text-right text-xs font-bold text-[#39e7ac]">
                    {idx + 1}.
                  </span>
                  {isOwner && !isFinished ? (
                    <input
                      type="text"
                      value={action.text}
                      onChange={(e) => updateAction(action.id, e.target.value)}
                      placeholder="Describe the action…"
                      className="flex-1 rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-2 text-sm text-[#edf3fb] outline-none placeholder:text-[#667386] focus:border-[rgba(57,231,172,0.40)]"
                    />
                  ) : (
                    <p className="flex-1 rounded-lg border border-[#3a4552] bg-[#28313d] px-3 py-2 text-sm text-[#edf3fb]">
                      {action.text}
                    </p>
                  )}
                  {isOwner && !isFinished && (
                    <button
                      onClick={() => removeAction(action.id)}
                      className="mt-2 text-[#667386] hover:text-[#ff8080]"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add action + footer — owner only */}
          {isOwner && (
            <>
              {!isFinished && (
                <button
                  onClick={addAction}
                  className="mb-6 w-full rounded-lg border border-dashed border-[#7a8798] px-4 py-2 text-xs font-semibold text-[#7a8798] hover:border-[#c3ceda] hover:text-[#c3ceda]"
                >
                  + Add Action
                </button>
              )}

              <div className="flex gap-3">
                {!isFinished && (
                  <button
                    onClick={handleSave}
                    disabled={isSaving || isGenerating}
                    className="flex-1 rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#c3ceda] hover:bg-[#323d4b] disabled:opacity-50"
                  >
                    {isSaving ? "Saving…" : "Save"}
                  </button>
                )}
                <button
                  onClick={handleToggle}
                  disabled={isSaving || isGenerating}
                  className={`flex-1 rounded-lg border px-4 py-2 text-xs font-bold uppercase tracking-widest disabled:opacity-50 ${
                    isFinished
                      ? "border-[#7a8798] bg-[#28313d] text-[#c3ceda] hover:bg-[#323d4b]"
                      : "border-green-600 bg-green-700/40 text-green-400 hover:bg-green-700/60"
                  }`}
                >
                  {isFinished ? "Reopen Retrospective" : "Finish Retrospective"}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
