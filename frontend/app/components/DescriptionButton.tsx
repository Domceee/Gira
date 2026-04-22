"use client";

import { useState } from "react";

export default function DescriptionButton({ text }: { text: string | null }) {
  const [open, setOpen] = useState(false);

  if (!text) return <span className="text-[#93a0b1]">—</span>;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-[#39e7ac] underline hover:opacity-80 transition-opacity"
      >
        View
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-6 max-w-lg w-full mx-4 shadow-2xl relative">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#c3ceda] mb-3">Description</h3>

            <p className="whitespace-pre-wrap text-sm text-[#f7faff] max-w-[400px]">
              {text}
            </p>
            <button
              onClick={() => setOpen(false)}
              className="mt-5 rounded-lg border border-[#7a8798] px-4 py-2 text-sm text-[#edf3fb] hover:bg-[#323d4b] hover:text-[#ffffff] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

