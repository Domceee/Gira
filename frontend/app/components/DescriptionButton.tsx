"use client";

import { useState } from "react";

export default function DescriptionButton({ text }: { text: string | null }) {
  const [open, setOpen] = useState(false);

  if (!text) return <span>—</span>;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-blue-600 underline hover:text-blue-800"
      >
        View
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg shadow-xl relative">
            <h3 className="text-lg font-semibold mb-3">Description</h3>

            <p className="whitespace-pre-wrap text-gray-800 max-w-[400px]">
            {text}
            </p>
            <button
              onClick={() => setOpen(false)}
              className="mt-4 rounded-lg bg-[#b08968] px-4 py-2 text-white hover:bg-[#8c6a4f]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
