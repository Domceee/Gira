"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

type TeamOption = { team_id: number; team_name: string | null };
type AssignMenuProps = { taskId: number; projectId: string; selectedTeamId: number | null; teams: TeamOption[] };

let currentOpenAssignMenuTaskId: number | null = null;
const closeAssignMenuCallbacks = new Map<number, () => void>();

export default function AssignMenu({ taskId, projectId, selectedTeamId, teams }: AssignMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const defaultTeamId = selectedTeamId ?? (teams.length > 0 ? teams[0].team_id : null);
  const [selectedTeam, setSelectedTeam] = useState<string>(String(defaultTeamId));
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleAssign = async (formData: FormData) => {
    setAssignError(null);
    setIsAssigning(true);
    const teamId = formData.get("team_id");
    try {
      const response = await apiFetch(`/api/tasks/${taskId}/assign_team?team_id=${teamId}`, { method: "PATCH" });
      if (!response.ok) { setAssignError("Failed to assign task to team."); return; }
      setOpen(false);
      router.refresh();
    } catch { setAssignError("Failed to assign. Please try again."); }
    finally { setIsAssigning(false); }
  };

  useEffect(() => {
    closeAssignMenuCallbacks.set(taskId, () => setOpen(false));
    return () => { closeAssignMenuCallbacks.delete(taskId); if (currentOpenAssignMenuTaskId === taskId) currentOpenAssignMenuTaskId = null; };
  }, [taskId]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (!containerRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggleMenu = () => {
    if (!open) {
      if (currentOpenAssignMenuTaskId !== null && currentOpenAssignMenuTaskId !== taskId) closeAssignMenuCallbacks.get(currentOpenAssignMenuTaskId)?.();
      setOpen(true);
      currentOpenAssignMenuTaskId = taskId;
    } else {
      setOpen(false);
      if (currentOpenAssignMenuTaskId === taskId) currentOpenAssignMenuTaskId = null;
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left overflow-visible">
      <button type="button" onClick={toggleMenu}
        className="rounded-lg border border-[#7a8798] bg-[#28313d] px-3 py-1.5 text-xs font-medium text-[#edf3fb] transition hover:bg-[#323d4b] hover:text-[#ffffff]">
        Assign
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[9999] mt-1 w-64 rounded-lg border border-[#7a8798] bg-[#28313d] p-4 shadow-xl">
          <form action={handleAssign} className="space-y-3">
            <input type="hidden" name="task_id" value={taskId} />
            <input type="hidden" name="project_id" value={projectId} />
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Team</label>
              <select name="team_id" value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} disabled={isAssigning}
                className="w-full rounded-lg border border-[#7a8798] bg-[#1f2630] px-3 py-2 text-sm text-[#ffffff] outline-none">
                {teams.map((team) => <option key={team.team_id} value={team.team_id}>{team.team_name ?? "Unnamed team"}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={isAssigning}
                className="flex-1 rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] py-2 text-sm font-bold text-[#39e7ac] transition hover:bg-[rgba(57,231,172,0.20)] disabled:opacity-50">
                {isAssigning ? "Saving..." : "Save"}
              </button>
              <button type="button" onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-[#7a8798] py-2 text-sm text-[#edf3fb] transition hover:bg-[#323d4b]">
                Cancel
              </button>
            </div>
            {assignError && <p className="text-xs text-[#ff8080]">{assignError}</p>}
          </form>
        </div>
      )}
    </div>
  );
}

