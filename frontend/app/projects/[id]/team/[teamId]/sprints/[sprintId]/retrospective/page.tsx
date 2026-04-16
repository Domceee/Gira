"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import Navbar from "@/app/components/navbar";
import Link from "next/link";

/* -------------------- TYPES -------------------- */

interface RetroData {
  start_doing: string[];
  stop_doing: string[];
  continue_doing: string[];
}

interface RetroColumnProps {
  title: string;
  items: string[];
  column: keyof RetroData;
  onUpdate: (column: keyof RetroData, index: number, value: string) => void;
  onAdd: (column: keyof RetroData) => void;
  onRemove: (column: keyof RetroData, index: number) => void;
  disabled: boolean;
}

/* -------------------- PAGE -------------------- */

export default function RetrospectivePage() {
  const { id: projectId, teamId, sprintId } = useParams() as {
    id: string;
    teamId: string;
    sprintId: string;
  };

  const [retroData, setRetroData] = useState<RetroData>({
    start_doing: [],
    stop_doing: [],
    continue_doing: [],
  });

  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  /* -------------------- FETCH -------------------- */

  const fetchRetroData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiFetch(`/api/sprints/${sprintId}/retrospective`, {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.retrospective_data) {
          setRetroData(data.retrospective_data);
        }
        setIsFinished(data.is_finished || false);
      } else {
        setError("Failed to load retrospective");
      }
    } catch {
      setError("Error loading retrospective");
    } finally {
      setLoading(false);
    }
  }, [sprintId]);

  useEffect(() => {
    fetchRetroData();
  }, [fetchRetroData]);

  /* -------------------- MUTATORS -------------------- */

  const updateItem = (
    column: keyof RetroData,
    index: number,
    value: string
  ) => {
    setRetroData((prev) => ({
      ...prev,
      [column]: prev[column].map((item, i) => (i === index ? value : item)),
    }));
  };

  const addItem = (column: keyof RetroData) => {
    setRetroData((prev) => ({
      ...prev,
      [column]: [...prev[column], ""],
    }));
  };

  const removeItem = (column: keyof RetroData, index: number) => {
    setRetroData((prev) => ({
      ...prev,
      [column]: prev[column].filter((_, i) => i !== index),
    }));
  };

  /* -------------------- SAVE / FINISH -------------------- */

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSaveSuccess(false);

      const response = await apiFetch(`/api/sprints/${sprintId}/retrospective`, {
        method: "PATCH",
        body: JSON.stringify(retroData),
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const err = await response.json();
        setError(err.detail || "Failed to save retrospective");
      }
    } catch {
      setError("Error saving retrospective");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinish = async () => {
    if (!window.confirm("Finish retrospective? It will become read‑only.")) return;

    try {
      setIsFinishing(true);
      setError(null);

      const response = await apiFetch(
        `/api/sprints/${sprintId}/retrospective/finish`,
        { method: "PATCH" }
      );

      if (response.ok) {
        setIsFinished(true);
      } else {
        const err = await response.json();
        setError(err.detail || "Failed to finish retrospective");
      }
    } catch {
      setError("Error finishing retrospective");
    } finally {
      setIsFinishing(false);
    }
  };

  /* -------------------- LOADING -------------------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5ede3] text-[#3e2a1f] flex items-center justify-center">
        Loading retrospective...
      </div>
    );
  }

  /* -------------------- RENDER -------------------- */

  return (
    <div className="min-h-screen bg-[#f5ede3] text-[#3e2a1f]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid grid-cols-[260px_1fr] gap-8">

          {/* Sidebar */}
          <aside className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-6 shadow-md">
            <h2 className="mb-6 text-2xl font-bold text-[#5c3b28]">Menu</h2>

            <div className="space-y-4">
              <Link
                href={`/projects/${projectId}/teams-dashboard?team=${teamId}`}
                className="block w-full rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3 text-left font-medium text-[#4b2e1f] transition hover:-translate-y-1 hover:shadow"
              >
                Back
              </Link>
            </div>
          </aside>

          {/* Main content */}
          <div className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-8 shadow-md">

            <h1 className="text-3xl font-bold text-[#5c3b28] mb-6">
              Sprint Retrospective
            </h1>

            {error && (
              <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900">
                {error}
              </div>
            )}

            {saveSuccess && (
              <div className="mb-4 rounded-xl border border-green-300 bg-green-50 p-4 text-green-900">
                Retrospective saved successfully!
              </div>
            )}

            {isFinished && (
              <div className="mb-4 rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-yellow-900">
                This retrospective is finished and cannot be edited.
              </div>
            )}

            {/* Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <RetroColumn
                title="Start Doing"
                items={retroData.start_doing}
                column="start_doing"
                onUpdate={updateItem}
                onAdd={addItem}
                onRemove={removeItem}
                disabled={isFinished}
              />

              <RetroColumn
                title="Stop Doing"
                items={retroData.stop_doing}
                column="stop_doing"
                onUpdate={updateItem}
                onAdd={addItem}
                onRemove={removeItem}
                disabled={isFinished}
              />

              <RetroColumn
                title="Continue Doing"
                items={retroData.continue_doing}
                column="continue_doing"
                onUpdate={updateItem}
                onAdd={addItem}
                onRemove={removeItem}
                disabled={isFinished}
              />
            </div>

            {!isFinished && (
              <div className="mt-8 flex gap-4">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-lg bg-[#b08968] px-6 py-3 font-semibold text-white hover:bg-[#8c6a4f]"
                >
                  {isSaving ? "Saving..." : "Save Retrospective"}
                </button>

                <button
                  onClick={handleFinish}
                  disabled={isFinishing}
                  className="rounded-lg bg-[#8b6b4a] px-6 py-3 font-semibold text-white hover:bg-[#9c7654]"
                >
                  {isFinishing ? "Finishing..." : "Finish Retrospective"}
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

/* -------------------- COLUMN COMPONENT -------------------- */

function RetroColumn({
  title,
  items,
  column,
  onUpdate,
  onAdd,
  onRemove,
  disabled,
}: RetroColumnProps) {
  return (
    <div className="rounded-xl border border-[#d9c1a7] bg-[#fffaf5] p-4 shadow-sm">
      <h2 className="text-xl font-bold text-[#5c3b28] mb-3">{title}</h2>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={item}
              disabled={disabled}
              onChange={(e) => onUpdate(column, index, e.target.value)}
              className="flex-1 rounded-lg border border-[#c8a27a] p-2 bg-white"
            />
            {!disabled && (
              <button
                onClick={() => onRemove(column, index)}
                className="rounded-lg bg-red-200 px-3 py-2 text-red-800 hover:bg-red-300"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {!disabled && (
        <button
          onClick={() => onAdd(column)}
          className="mt-4 w-full rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-3 py-2 text-sm font-medium text-[#4b2e1f] hover:-translate-y-0.5 hover:shadow"
        >
          + Add Item
        </button>
      )}
    </div>
  );
}
