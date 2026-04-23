"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { apiFetch } from "@/app/lib/api";

type TaskActionsProps = {
  taskId: number;
  canDelete?: boolean;
};

export default function TaskActions({ taskId, canDelete = true }: TaskActionsProps) {
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!canDelete) {
    return null;
  }

  const handleDelete = async () => {
    setDeleteError(null);
    setIsDeleting(true);

    try {
      const response = await apiFetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!response.ok) {
        setDeleteError("Failed to delete task.");
        return;
      }

      setConfirmingDelete(false);
      router.refresh();
    } catch {
      setDeleteError("Failed to delete task. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmingDelete(true)}
        disabled={isDeleting}
        aria-label="Delete task"
        title="Delete task"
        className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#ff4040]/20 bg-[#ff4040]/05 text-[#ff8080] transition hover:bg-[#ff4040]/10 hover:text-[#ffb0b0] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>

      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setConfirmingDelete(false)}>
          <div
            className="w-full max-w-sm rounded-xl border border-[#7a8798] bg-[#1f2630] p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#ffffff]">Delete task?</h3>
            <p className="mt-2 text-sm leading-6 text-[#c3ceda]">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>

            {deleteError && <p className="mt-3 text-sm text-[#ff8080]">{deleteError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={isDeleting}
                className="rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-2 text-sm text-[#edf3fb] transition hover:bg-[#323d4b] hover:text-[#ffffff] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-lg border border-[#ff4040]/30 bg-[#ff4040]/10 px-4 py-2 text-sm font-bold text-[#ff8080] transition hover:bg-[#ff4040]/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
