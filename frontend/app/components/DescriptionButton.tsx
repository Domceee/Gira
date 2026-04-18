"use client";

import { useState } from "react";

export default function DescriptionButton({ text }: { text: string | null }) {
  const [open, setOpen] = useState(false);

  if (!text) return <span className="text-[#333]">—</span>;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-[#39ff14] underline hover:opacity-80 transition-opacity"
      >
        View
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-6 max-w-lg w-full mx-4 shadow-2xl relative">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#555] mb-3">Description</h3>

            <p className="whitespace-pre-wrap text-sm text-[#ccc] max-w-[400px]">
              {text}
            </p>
            <button
              onClick={() => setOpen(false)}
              className="mt-5 rounded-lg border border-[#1e1e1e] px-4 py-2 text-sm text-[#888] hover:bg-[#161616] hover:text-[#f0f0f0] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
