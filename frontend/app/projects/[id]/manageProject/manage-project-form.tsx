"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

type Project = {
  id: number;
  name: string;
  description: string | null;
  is_owner: boolean;
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

    if (!emailQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const res = await apiFetch(
  `/api/user/search?email=${encodeURIComponent(emailQuery.trim())}&project_id=${project.id}`,
    {
    method: "GET",
    }
    );

    if (!res.ok) {
      setError("Failed to search users");
      return;
    }

    const data = await res.json();
    setSearchResults(data);
  }

  function addUser(user: UserSearchResult) {
    const exists = selectedUsers.some((u) => u.id_user === user.id_user);
    if (exists) return;
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
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      if (!updateRes.ok) {
        const data = await updateRes.json().catch(() => null);
        throw new Error(data?.detail || "Failed to update project");
      }

      if (selectedUsers.length > 0) {
        const addMembersRes = await apiFetch(`/api/projects/${project.id}/members`, {
          method: "POST",
          body: JSON.stringify({
            user_ids: selectedUsers.map((u) => u.id_user),
          }),
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
    const first = window.confirm("Are you sure you want to delete this project?");
    if (!first) return;

    const second = window.confirm("This action cannot be undone. Delete project permanently?");
    if (!second) return;

    try {
      setDeleting(true);
      setError("");

      const res = await apiFetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

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

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#4b2e1f]">Project name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#4b2e1f]">Description</label>
          <textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-[#c8a27a] bg-[#fdf7f2] px-4 py-3"
          />
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-[#d8b692] bg-[#fdf7f2] p-5">
        <h2 className="text-xl font-semibold text-[#5c3b28]">Add project members</h2>

        <div className="flex gap-3">
          <input
            value={emailQuery}
            onChange={(e) => setEmailQuery(e.target.value)}
            placeholder="Search by email"
            className="flex-1 rounded-xl border border-[#c8a27a] bg-white px-4 py-3"
          />
          <button
            type="button"
            onClick={handleSearch}
            className="rounded-xl bg-[#8b5e3c] px-5 py-3 font-semibold text-white hover:bg-[#734c30]"
          >
            Search
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-3">
            {searchResults.map((user) => (
              <div
                key={user.id_user}
                className="flex items-center justify-between rounded-lg border border-[#c8a27a] bg-white px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-[#4b2e1f]">{user.name}</p>
                  <p className="text-sm text-[#6f4e37]">{user.email}</p>
                  <p className="text-sm text-[#6f4e37]">{user.country ?? "Unknown country"}</p>
                </div>

                <button
                  type="button"
                  onClick={() => addUser(user)}
                  className="rounded-lg bg-[#a47148] px-4 py-2 text-white hover:bg-[#8b5e3c]"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedUsers.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-[#5c3b28]">Selected members</h3>

            {selectedUsers.map((user) => (
              <div
                key={user.id_user}
                className="flex items-center justify-between rounded-lg border border-[#c8a27a] bg-white px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-[#4b2e1f]">{user.name}</p>
                  <p className="text-sm text-[#6f4e37]">{user.email}</p>
                  <p className="text-sm text-[#6f4e37]">{user.country ?? "Unknown country"}</p>
                </div>

                <button
                  type="button"
                  onClick={() => removeUser(user.id_user)}
                  className="rounded-lg border border-red-400 px-4 py-2 text-red-700 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-[#8b5e3c] px-6 py-3 font-semibold text-white hover:bg-[#734c30] disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-xl bg-red-700 px-6 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
        >
          {deleting ? "Deleting..." : "Delete Project"}
        </button>
      </div>
    </div>
  );
}