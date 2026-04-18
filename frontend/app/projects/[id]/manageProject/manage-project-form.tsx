"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

type Project = {
  id: number;
  name: string | null;
  description: string | null;
  is_owner: boolean;
  can_delete: boolean;
  delete_block_reason: string | null;
};

type UserSearchResult = {
  id_user: number;
  name: string;
  email: string;
  country: string | null;
  city: string | null;
};

export default function ManageProjectForm({ project }: { project: Project }) {
  const router = useRouter();

  const [name, setName] = useState(project.name ?? "");
  const [description, setDescription] = useState(project.description ?? "");
  const [emailQuery, setEmailQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch() {
    setError("");
    if (!emailQuery.trim()) { setSearchResults([]); return; }
    const res = await apiFetch(
      `/api/user/search?email=${encodeURIComponent(emailQuery.trim())}&project_id=${project.id}`,
      { method: "GET" }
    );
    if (!res.ok) { setError("Failed to search users"); return; }
    setSearchResults(await res.json());
  }

  function addUser(user: UserSearchResult) {
    if (selectedUsers.some((u) => u.id_user === user.id_user)) return;
    setSelectedUsers((prev) => [...prev, user]);
  }

  function removeUser(userId: number) {
    setSelectedUsers((prev) => prev.filter((u) => u.id_user !== userId));
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");

      const updateRes = await apiFetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });

      if (!updateRes.ok) {
        const data = await updateRes.json().catch(() => null);
        throw new Error(data?.detail || "Failed to update project");
      }

      if (selectedUsers.length > 0) {
        const addMembersRes = await apiFetch(`/api/projects/${project.id}/members`, {
          method: "POST",
          body: JSON.stringify({ user_ids: selectedUsers.map((u) => u.id_user) }),
        });
        if (!addMembersRes.ok) {
          const data = await addMembersRes.json().catch(() => null);
          throw new Error(data?.detail || "Failed to add members");
        }
      }

      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!project.can_delete) return;
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    if (!window.confirm("This action cannot be undone. Delete project permanently?")) return;

    try {
      setDeleting(true);
      setError("");
      const res = await apiFetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Failed to delete project");
      }
      router.push("/main");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  const inputClass = "w-full rounded-lg border border-[#1e1e1e] bg-[#111] px-4 py-3 text-sm text-[#f0f0f0] outline-none focus:border-[rgba(57,255,20,0.3)]";
  const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#555]";

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Project name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#555]">Add project members</h2>

        <div className="flex gap-3">
          <input
            value={emailQuery}
            onChange={(e) => setEmailQuery(e.target.value)}
            placeholder="Search by email"
            className={`flex-1 ${inputClass}`}
          />
          <button
            type="button"
            onClick={handleSearch}
            className="rounded-lg border border-[#1e1e1e] px-5 py-3 text-sm font-semibold text-[#888] transition hover:bg-[#161616] hover:text-[#f0f0f0]"
          >
            Search
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((user) => (
              <div key={user.id_user} className="flex items-center justify-between rounded-lg border border-[#1e1e1e] bg-[#111] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#f0f0f0]">{user.name}</p>
                  <p className="text-xs text-[#555]">{user.email}</p>
                  <p className="text-xs text-[#555]">{user.country ?? "Unknown country"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => addUser(user)}
                  className="rounded-lg border border-[rgba(57,255,20,0.3)] bg-[rgba(57,255,20,0.08)] px-4 py-2 text-sm font-bold text-[#39ff14] transition hover:bg-[rgba(57,255,20,0.14)]"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedUsers.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#555]">Selected members</h3>
            {selectedUsers.map((user) => (
              <div key={user.id_user} className="flex items-center justify-between rounded-lg border border-[#1e1e1e] bg-[#111] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#f0f0f0]">{user.name}</p>
                  <p className="text-xs text-[#555]">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeUser(user.id_user)}
                  className="rounded-lg border border-[#ff4040]/30 px-4 py-2 text-sm text-[#ff8080] transition hover:bg-[#ff4040]/10"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-[#ff4040]/20 bg-[#ff4040]/05 px-4 py-3 text-sm text-[#ff8080]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg border border-[rgba(57,255,20,0.3)] bg-[rgba(57,255,20,0.08)] px-6 py-3 text-sm font-bold text-[#39ff14] transition hover:bg-[rgba(57,255,20,0.14)] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>

        <span title={!project.can_delete ? project.delete_block_reason ?? "Cannot delete" : ""}>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || !project.can_delete}
            className="rounded-lg border border-[#ff4040]/30 px-6 py-3 text-sm font-semibold text-[#ff8080] transition hover:bg-[#ff4040]/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting ? "Deleting..." : "Delete Project"}
          </button>
        </span>
      </div>
    </div>
  );
}
