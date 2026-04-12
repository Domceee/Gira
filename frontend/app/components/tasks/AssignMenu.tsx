"use client";

import { useEffect, useRef, useState } from "react";
import { assignTaskToTeam } from "@/app/projects/[id]/backlog/actions";

type TeamOption = {
  team_id: number;
  team_name: string | null;
};

type AssignMenuProps = {
  taskId: number;
  projectId: string;
  selectedTeamId: number | null;
  teams: TeamOption[];
};

let currentOpenAssignMenuTaskId: number | null = null;
const closeAssignMenuCallbacks = new Map<number, () => void>();

export default function AssignMenu({
  taskId,
  projectId,
  selectedTeamId,
  teams,
}: AssignMenuProps) {
  const [open, setOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>(String(selectedTeamId ?? "null"));
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    closeAssignMenuCallbacks.set(taskId, () => setOpen(false));
    return () => {
      closeAssignMenuCallbacks.delete(taskId);
      if (currentOpenAssignMenuTaskId === taskId) {
        currentOpenAssignMenuTaskId = null;
      }
    };
  }, [taskId]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggleMenu = () => {
    if (!open) {
      if (currentOpenAssignMenuTaskId !== null && currentOpenAssignMenuTaskId !== taskId) {
        const closeOther = closeAssignMenuCallbacks.get(currentOpenAssignMenuTaskId);
        closeOther?.();
      }
      setOpen(true);
      currentOpenAssignMenuTaskId = taskId;
      return;
    }

    setOpen(false);
    if (currentOpenAssignMenuTaskId === taskId) {
      currentOpenAssignMenuTaskId = null;
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left overflow-visible">
      <button
        type="button"
        onClick={toggleMenu}
        className="rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-3 py-2 text-sm font-medium text-[#4b2e1f] hover:bg-[#fffaf5]"
      >
        Assign
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-md bg-white shadow-lg border border-gray-200 z-[9999] p-4">
          <form action={assignTaskToTeam} className="space-y-4">
            <input type="hidden" name="task_id" value={taskId} />
            <input type="hidden" name="project_id" value={projectId} />

            <div>
              <label className="mb-1 block text-sm font-medium">Team</label>
              <select
                name="team_id"
                value={selectedTeam}
                onChange={(event) => setSelectedTeam(event.target.value)}
                className="w-full rounded-lg border border-[#c8a27a] bg-white p-2"
              >
                
                {teams.map((team) => (
                  <option key={team.team_id} value={team.team_id}>
                    {team.team_name ?? "Unnamed team"}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-[#c8a27a] px-4 py-2 text-sm text-[#4b2e1f] hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#b08968] px-4 py-2 text-sm font-medium text-white hover:bg-[#8c6a4f]"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
