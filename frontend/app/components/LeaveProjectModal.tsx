"use client";

import { useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { useRouter } from "next/navigation";

type Props = {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
};

export default function LeaveProjectModal({ projectId, isOpen, onClose }: Props) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleLeave() {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/projects/${projectId}/leave`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.detail || "Could not leave the project");
        setLoading(false);
        return;
      }

      onClose();
      router.push("/projects");
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  const canLeave = input.trim() === "Leave";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-[#1f2630] border border-[#667386] rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-semibold text-[#edf3fb] mb-3">Leave Project</h2>

        <p className="text-[#c3ceda] mb-4">
          To confirm, type <span className="text-red-400 font-semibold">Leave</span> below.
          You will be removed from all teams and unassigned from all tasks.
        </p>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Type "Leave" to confirm'
          className="w-full rounded-md bg-[#28313d] border border-[#7a8798] px-3 py-2 text-sm text-[#edf3fb] focus:outline-none focus:ring-2 focus:ring-[#39e7ac]"
        />

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded bg-gray-300 text-black hover:bg-gray-400 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleLeave}
            disabled={!canLeave || loading}
            className={`px-4 py-2 rounded text-white transition-colors ${
              canLeave
                ? "bg-red-600 hover:bg-red-700"
                : "bg-red-600/40 cursor-not-allowed"
            }`}
          >
            {loading ? "Leaving..." : "Leave Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
