"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { toast, Toaster } from "react-hot-toast";

type Team = {
  id_team: number;
  name: string | null;
  can_delete: boolean;
  delete_block_reason: string | null;
};

type UserInfo = {
  id_user: number;
  name: string;
  email: string;
  country: string | null;
  city: string | null;
  Owner: boolean;
};

type TeamMember = {
  id_user: number;
  name: string;
  email: string;
  country: string | null;
  city: string | null;
  role_in_team: string | null;
  effectiveness: number | null;
  Owner: boolean;
};

type Props = {
  projectId: string;
  projectName: string | null;
};

export default function ManageTeamsPageContent({ projectId, projectName }: Props) {
  const router = useRouter();

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<TeamMember[]>([]);
  const [availableMembers, setAvailableMembers] = useState<UserInfo[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [teamName, setTeamName] = useState("");

  const [loadingTeams, setLoadingTeams] = useState(true);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [savingMembers, setSavingMembers] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function loadTeams() {
    try {
      setLoadingTeams(true);
      setError("");
      const res = await apiFetch(`/api/projects/${projectId}/teams`, { method: "GET", cache: "no-store" });
      if (!res.ok) throw new Error(await res.text() || "Failed to fetch teams");
      const data = await res.json();
      setTeams(data);
      if (data.length > 0 && selectedTeamId === null) setSelectedTeamId(data[0].id_team);
      if (data.length === 0) { setSelectedTeamId(null); setSelectedTeamMembers([]); setAvailableMembers([]); }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
    } finally {
      setLoadingTeams(false);
    }
  }

  async function loadSelectedTeamData(teamId: number) {
    try {
      setError("");
      setSelectedUserIds([]);
      const [membersRes, availableRes] = await Promise.all([
        apiFetch(`/api/projects/${projectId}/teams/${teamId}/members`, { method: "GET", cache: "no-store" }),
        apiFetch(`/api/projects/${projectId}/available-members?team_id=${teamId}`, { method: "GET", cache: "no-store" }),
      ]);
      if (!membersRes.ok) throw new Error(await membersRes.text() || "Failed to fetch team members");
      if (!availableRes.ok) throw new Error(await availableRes.text() || "Failed to fetch available members");
      setSelectedTeamMembers(await membersRes.json());
      setAvailableMembers(await availableRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team data");
    }
  }

  useEffect(() => { loadTeams(); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (selectedTeamId !== null) loadSelectedTeamData(selectedTeamId); }, [selectedTeamId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreateTeam() {
    if (!teamName.trim()) { setError("Team name is required."); return; }
    try {
      setError("");
      setCreatingTeam(true);
      const res = await apiFetch(`/api/projects/${projectId}/teams`, {
        method: "POST",
        body: JSON.stringify({ name: teamName.trim() }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || "Failed to create team");
      toast.success("Team created successfully");
      const createdTeam = await res.json();
      setTeamName("");
      await loadTeams();
      setSelectedTeamId(createdTeam.id_team);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
      toast.error("Failed to create team");
    } finally {
      setCreatingTeam(false);
    }
  }

  function toggleSelectedUser(userId: number) {
    setSelectedUserIds((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  }

  async function handleAddMembersToTeam() {
    if (selectedTeamId === null) return;
    if (selectedUserIds.length === 0) { setError("Select at least one project member to add."); return; }
    try {
      setError("");
      setSavingMembers(true);
      const res = await apiFetch(`/api/projects/${projectId}/teams/${selectedTeamId}/members`, {
        method: "POST",
        body: JSON.stringify({ user_ids: selectedUserIds }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || "Failed to add members");
      toast.success("Member(s) added successfully");
      await loadSelectedTeamData(selectedTeamId);
      setSelectedUserIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add members");
      toast.error("Failed to add member(s)");
    } finally {
      setSavingMembers(false);
    }
  }

  async function handleRemoveTeamMember(userId: number) {
    if (selectedTeamId === null) return;
    try {
      setError("");
      setRemovingMemberId(userId);
      const res = await apiFetch(`/api/projects/${projectId}/teams/${selectedTeamId}/members/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || "Failed to remove member");
      toast.success("Member removed successfully");
      await loadSelectedTeamData(selectedTeamId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
      toast.error("Failed to remove member");
    } finally {
      setRemovingMemberId(null);
    }
  }

  async function handleDeleteTeam() {
    if (selectedTeamId === null) return;
    const selectedTeam = teams.find((team) => team.id_team === selectedTeamId);
    if (!selectedTeam?.can_delete) return;
    if (!window.confirm("Are you sure you want to delete this team?")) return;
    if (!window.confirm("This will remove all team memberships for this team. Continue?")) return;
    try {
      setError("");
      setDeletingTeam(true);
      const res = await apiFetch(`/api/projects/${projectId}/teams/${selectedTeamId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || "Failed to delete team");
      toast.success("Team deleted successfully");
      await loadTeams();
      setSelectedTeamId(null);
      setSelectedTeamMembers([]);
      setAvailableMembers([]);
      setSelectedUserIds([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete team");
      toast.error(err instanceof Error ? err.message :"Failed to delete team");
    } finally {
      setDeletingTeam(false);
    }
  }

  const inputClass = "w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-3 text-sm text-[#ffffff] outline-none focus:border-[rgba(57,231,172,0.40)]";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <Toaster 
          possition="top-right"
        
        />  
      <aside className="space-y-4">
        <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Create Team</h2>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Enter team name"
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleCreateTeam}
            disabled={creatingTeam}
            className="mt-3 w-full rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] py-2.5 text-sm font-bold text-[#39e7ac] transition hover:bg-[rgba(57,231,172,0.20)] disabled:opacity-50"
          >
            {creatingTeam ? "Creating..." : "Create Team"}
          </button>
        </div>

        <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#c3ceda]">Teams in {projectName}</h2>
          {loadingTeams ? (
            <p className="text-xs text-[#c3ceda]">Loading teams...</p>
          ) : teams.length === 0 ? (
            <p className="text-xs text-[#c3ceda]">No teams created yet.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {teams.map((team) => (
                <button
                  key={team.id_team}
                  type="button"
                  onClick={() => setSelectedTeamId(team.id_team)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                    selectedTeamId === team.id_team
                      ? "bg-[rgba(57,231,172,0.16)] text-[#39e7ac]"
                      : "text-[#edf3fb] hover:bg-[#323d4b] hover:text-[#ffffff]"
                  }`}
                >
                  {team.name || "Unnamed team"}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      <section className="space-y-4">
        {error && (
          <p className="rounded-lg border border-[#ff4040]/20 bg-[#ff4040]/05 px-4 py-3 text-sm text-[#ff8080]">
            {error}
          </p>
        )}

        {selectedTeamId === null ? (
          <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-6 text-sm text-[#c3ceda]">
            Select a team to manage it.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c3ceda]">Current Team Members</h2>
                <span title={!teams.find((t) => t.id_team === selectedTeamId)?.can_delete ? teams.find((t) => t.id_team === selectedTeamId)?.delete_block_reason ?? "Cannot delete" : ""}>
                  <button
                    type="button"
                    onClick={handleDeleteTeam}
                    disabled={deletingTeam || !teams.find((t) => t.id_team === selectedTeamId)?.can_delete}
                    className="rounded-lg border border-[#ff4040]/30 px-4 py-2 text-sm text-[#ff8080] transition hover:bg-[#ff4040]/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {deletingTeam ? "Deleting..." : "Dismantle Team"}
                  </button>
                </span>
              </div>

              {selectedTeamMembers.length === 0 ? (
                <p className="text-sm text-[#c3ceda]">This team has no members yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedTeamMembers.map((member) => (
                    <div key={member.id_user} className="flex items-center justify-between rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[#ffffff]">{member.name}</p>

                            {member.Owner && (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide 
                                              bg-green-600 text-white rounded-md">
                                Owner
                              </span>
                            )}
                        </div>
                        <p className="text-xs text-[#c3ceda]">{member.email}</p>
                        <p className="text-xs text-[#c3ceda]">{member.country ?? "Unknown country"}{member.city ? `, ${member.city}` : ""}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTeamMember(member.id_user)}
                        disabled={removingMemberId === member.id_user}
                        className="rounded-lg border border-[#ff4040]/30 px-4 py-2 text-sm text-[#ff8080] transition hover:bg-[#ff4040]/10 disabled:opacity-50"
                      >
                        {removingMemberId === member.id_user ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c3ceda]">Add Project Members to Team</h2>
                <button
                  type="button"
                  onClick={handleAddMembersToTeam}
                  disabled={savingMembers}
                  className="rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] px-4 py-2 text-sm font-bold text-[#39e7ac] transition hover:bg-[rgba(57,231,172,0.20)] disabled:opacity-50"
                >
                  {savingMembers ? "Saving..." : "Add Selected"}
                </button>
              </div>

              {availableMembers.length === 0 ? (
                <p className="text-sm text-[#c3ceda]">No available project members to add.</p>
              ) : (
                <div className="space-y-2">
                  {availableMembers.map((member) => {
                    const isChecked = selectedUserIds.includes(member.id_user);
                    return (
                      <label
                        key={member.id_user}
                        className="flex cursor-pointer items-start gap-4 rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-3 transition hover:border-[#7b8798]"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectedUser(member.id_user)}
                          className="mt-1 h-4 w-4 accent-[#39e7ac]"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[#ffffff]">{member.name}</p>

                            {member.Owner && (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide 
                                              bg-green-600 text-white rounded-md">
                                Owner
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-[#c3ceda]">{member.email}</p>
                          <p className="text-xs text-[#c3ceda]">
                            {member.country ?? "Unknown country"}
                            {member.city ? `, ${member.city}` : ""}
                          </p>
                        </div>

                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
