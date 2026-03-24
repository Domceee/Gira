"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

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
};

type TeamMember = {
  id_user: number;
  name: string;
  email: string;
  country: string | null;
  city: string | null;
  role_in_team: string | null;
  effectiveness: number | null;
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

      const res = await apiFetch(`/api/projects/${projectId}/teams`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch teams");
      }

      const data = await res.json();
      setTeams(data);

      if (data.length > 0 && selectedTeamId === null) {
        setSelectedTeamId(data[0].id_team);
      }

      if (data.length === 0) {
        setSelectedTeamId(null);
        setSelectedTeamMembers([]);
        setAvailableMembers([]);
      }
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
        apiFetch(`/api/projects/${projectId}/teams/${teamId}/members`, {
          method: "GET",
          cache: "no-store",
        }),
        apiFetch(`/api/projects/${projectId}/available-members?team_id=${teamId}`, {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      if (!membersRes.ok) {
        const text = await membersRes.text();
        throw new Error(text || "Failed to fetch team members");
      }

      if (!availableRes.ok) {
        const text = await availableRes.text();
        throw new Error(text || "Failed to fetch available members");
      }

      const membersData = await membersRes.json();
      const availableData = await availableRes.json();

      setSelectedTeamMembers(membersData);
      setAvailableMembers(availableData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team data");
    }
  }

  useEffect(() => {
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (selectedTeamId !== null) {
      loadSelectedTeamData(selectedTeamId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId]);

  async function handleCreateTeam() {
    try {
      setError("");

      if (!teamName.trim()) {
        setError("Team name is required.");
        return;
      }

      setCreatingTeam(true);

      const res = await apiFetch(`/api/projects/${projectId}/teams`, {
        method: "POST",
        body: JSON.stringify({
          name: teamName.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Failed to create team");
      }

      const createdTeam = await res.json();
      setTeamName("");
      await loadTeams();
      setSelectedTeamId(createdTeam.id_team);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setCreatingTeam(false);
    }
  }

  function toggleSelectedUser(userId: number) {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  async function handleAddMembersToTeam() {
    try {
      if (selectedTeamId === null) return;

      setError("");

      if (selectedUserIds.length === 0) {
        setError("Select at least one project member to add.");
        return;
      }

      setSavingMembers(true);

      const res = await apiFetch(`/api/projects/${projectId}/teams/${selectedTeamId}/members`, {
        method: "POST",
        body: JSON.stringify({
          user_ids: selectedUserIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Failed to add members");
      }

      await loadSelectedTeamData(selectedTeamId);
      setSelectedUserIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add members");
    } finally {
      setSavingMembers(false);
    }
  }

  async function handleRemoveTeamMember(userId: number) {
    try {
      if (selectedTeamId === null) return;

      setError("");
      setRemovingMemberId(userId);

      const res = await apiFetch(
        `/api/projects/${projectId}/teams/${selectedTeamId}/members/${userId}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Failed to remove member");
      }

      await loadSelectedTeamData(selectedTeamId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemovingMemberId(null);
    }
  }

  async function handleDeleteTeam() {
    try {
      if (selectedTeamId === null) return;
      const selectedTeam = teams.find((team) => team.id_team === selectedTeamId);
      if (!selectedTeam?.can_delete) return;

      const first = window.confirm("Are you sure you want to delete this team?");
      if (!first) return;

      const second = window.confirm(
        "This will remove all team memberships for this team. Continue?"
      );
      if (!second) return;

      setError("");
      setDeletingTeam(true);

      const res = await apiFetch(`/api/projects/${projectId}/teams/${selectedTeamId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Failed to delete team");
      }

      await loadTeams();
      setSelectedTeamId(null);
      setSelectedTeamMembers([]);
      setAvailableMembers([]);
      setSelectedUserIds([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete team");
    } finally {
      setDeletingTeam(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-6">
        <div className="rounded-2xl border border-[#c8a27a] bg-[#fdf7f2] p-5">
          <h2 className="mb-4 text-xl font-semibold text-[#5c3b28]">Create Team</h2>

          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Enter team name"
            className="w-full rounded-xl border border-[#c8a27a] bg-white px-4 py-3 text-[#3e2a1f] outline-none transition focus:border-[#8b5e3c] focus:ring-2 focus:ring-[#d8b692]"
          />

          <button
            type="button"
            onClick={handleCreateTeam}
            disabled={creatingTeam}
            className="mt-4 w-full rounded-xl bg-[#8b5e3c] px-5 py-3 font-semibold text-white transition hover:bg-[#734c30] disabled:opacity-60"
          >
            {creatingTeam ? "Creating..." : "Create Team"}
          </button>
        </div>

        <div className="rounded-2xl border border-[#c8a27a] bg-[#fdf7f2] p-5">
          <h2 className="mb-4 text-xl font-semibold text-[#5c3b28]">Teams in {projectName}</h2>

          {loadingTeams ? (
            <p className="text-[#6f4e37]">Loading teams...</p>
          ) : teams.length === 0 ? (
            <p className="text-[#6f4e37]">No teams created yet.</p>
          ) : (
            <div className="space-y-3">
              {teams.map((team) => (
                <button
                  key={team.id_team}
                  type="button"
                  onClick={() => setSelectedTeamId(team.id_team)}
                  className={`w-full rounded-xl border px-4 py-3 text-left font-medium transition ${
                    selectedTeamId === team.id_team
                      ? "border-[#8b5e3c] bg-[#ecd8c2] text-[#4b2e1f]"
                      : "border-[#c8a27a] bg-white text-[#4b2e1f] hover:-translate-y-1 hover:shadow"
                  }`}
                >
                  {team.name || "Unnamed team"}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      <section className="space-y-6">
        {error && (
          <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {selectedTeamId === null ? (
          <div className="rounded-2xl border border-[#c8a27a] bg-[#fdf7f2] p-6 text-[#6f4e37]">
            Select a team to manage it.
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-[#c8a27a] bg-[#fdf7f2] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-[#5c3b28]">Current Team Members</h2>

                <span
                  title={
                    !teams.find((team) => team.id_team === selectedTeamId)?.can_delete
                      ? teams.find((team) => team.id_team === selectedTeamId)?.delete_block_reason ?? "Cannot delete"
                      : ""
                  }
                >
                  <button
                    type="button"
                    onClick={handleDeleteTeam}
                    disabled={deletingTeam || !teams.find((team) => team.id_team === selectedTeamId)?.can_delete}
                    className="rounded-xl bg-red-700 px-5 py-2 font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-100 disabled:opacity-100"
                  >
                    {deletingTeam ? "Deleting..." : "Dismantle Team"}
                  </button>
                </span>
              </div>

              {selectedTeamMembers.length === 0 ? (
                <p className="text-[#6f4e37]">This team has no members yet.</p>
              ) : (
                <div className="space-y-3">
                  {selectedTeamMembers.map((member) => (
                    <div
                      key={member.id_user}
                      className="flex items-center justify-between rounded-xl border border-[#c8a27a] bg-white px-4 py-4"
                    >
                      <div>
                        <p className="font-semibold text-[#4b2e1f]">{member.name}</p>
                        <p className="text-sm text-[#6f4e37]">{member.email}</p>
                        <p className="text-sm text-[#6f4e37]">
                          {member.country ?? "Unknown country"}
                          {member.city ? `, ${member.city}` : ""}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveTeamMember(member.id_user)}
                        disabled={removingMemberId === member.id_user}
                        className="rounded-lg border border-red-400 px-4 py-2 text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                      >
                        {removingMemberId === member.id_user ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#c8a27a] bg-[#fdf7f2] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-[#5c3b28]">Add Project Members to Team</h2>

                <button
                  type="button"
                  onClick={handleAddMembersToTeam}
                  disabled={savingMembers}
                  className="rounded-xl bg-[#8b5e3c] px-5 py-2 font-semibold text-white transition hover:bg-[#734c30] disabled:opacity-60"
                >
                  {savingMembers ? "Saving..." : "Add Selected Members"}
                </button>
              </div>

              {availableMembers.length === 0 ? (
                <p className="text-[#6f4e37]">
                  No available project members to add. Everyone may already be assigned.
                </p>
              ) : (
                <div className="space-y-3">
                  {availableMembers.map((member) => {
                    const isChecked = selectedUserIds.includes(member.id_user);

                    return (
                      <label
                        key={member.id_user}
                        className="flex cursor-pointer items-start gap-4 rounded-xl border border-[#c8a27a] bg-white px-4 py-4 transition hover:shadow"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectedUser(member.id_user)}
                          className="mt-1 h-4 w-4"
                        />

                        <div>
                          <p className="font-semibold text-[#4b2e1f]">{member.name}</p>
                          <p className="text-sm text-[#6f4e37]">{member.email}</p>
                          <p className="text-sm text-[#6f4e37]">
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
