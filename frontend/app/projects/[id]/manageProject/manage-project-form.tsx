"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

type Project = {
  id: number;
  name: string | null;
  description: string | null;
  use_swimlane_board: boolean;
  is_owner: boolean;
  can_delete: boolean;
  delete_block_reason: string | null;
};

type ProjectMember = {
  id_user: number;
  name: string | null;
  email: string;
  is_owner: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ManageProjectForm({ project }: { project: Project }) {
  const router = useRouter();

  const [name, setName] = useState(project.name ?? "");
  const [description, setDescription] = useState(project.description ?? "");
  const [useSwimlaneBoard, setUseSwimlaneBoard] = useState(project.use_swimlane_board);
  const [emailQuery, setEmailQuery] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await apiFetch(`/api/projects/${project.id}/members`);
        if (response.ok) {
          const data = await response.json();
          setMembers(data);
        }
      } catch (err) {
        console.error('Failed to fetch members:', err);
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchMembers();
  }, [project.id]);

  function handleAddEmail() {
    setError("");
    const normalizedEmail = emailQuery.trim().toLowerCase();
    if (!normalizedEmail) return;
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (selectedEmails.includes(normalizedEmail)) {
      setError("That email is already queued.");
      return;
    }

    setSelectedEmails((prev) => [...prev, normalizedEmail]);
    setEmailQuery("");
  }

  function removeEmail(email: string) {
    setSelectedEmails((prev) => prev.filter((value) => value !== email));
  }

  async function handleRemoveMember(userId: number) {
    if (!window.confirm("Are you sure you want to remove this member from the project?")) return;
    try {
      const response = await apiFetch(`/api/projects/${project.id}/members/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail || "Failed to remove member");
      }
      setMembers((prev) => prev.filter((m) => m.id_user !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
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
          use_swimlane_board: useSwimlaneBoard,
        }),
      });

      if (!updateRes.ok) {
        const data = await updateRes.json().catch(() => null);
        throw new Error(data?.detail || "Failed to update project");
      }

      if (selectedEmails.length > 0) {
        const addMembersRes = await apiFetch(`/api/projects/${project.id}/members`, {
          method: "POST",
          body: JSON.stringify({ emails: selectedEmails }),
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

  const inputClass = "w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-4 py-3 text-sm text-[#ffffff] outline-none focus:border-[rgba(57,231,172,0.40)]";
  const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c3ceda]";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#7a8798] bg-[#1f2630] p-6">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#39e7ac]">Project Details</p>
            <h2 className="mt-2 text-xl font-bold text-[#ffffff]">
              {project.name ?? "Untitled project"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[#c3ceda]">
              Update the basics here, then save once when you are ready.
            </p>
          </div>
          <div className="rounded-xl border border-[#667386] bg-[#28313d] px-4 py-3 text-sm text-[#c3ceda]">
            Board view: <span className="font-semibold text-[#ffffff]">{useSwimlaneBoard ? "Swimlane" : "Kanban"}</span>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_340px]">
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Project name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          <aside className="rounded-2xl border border-[#667386] bg-[#28313d] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c3ceda]">Board View</p>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-[#ffffff]">Swimlane</p>
                <p className="mt-1 text-sm text-[#c3ceda]">Grouped by assignee</p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={useSwimlaneBoard}
                aria-label="Use swimlane board"
                onClick={() => setUseSwimlaneBoard((current) => !current)}
                className={`relative inline-flex h-11 w-28 shrink-0 items-center rounded-full border px-3 transition ${
                  useSwimlaneBoard
                    ? "border-[rgba(57,231,172,0.40)] bg-[#39e7ac]"
                    : "border-[#7a8798] bg-[#1f2630]"
                }`}
              >
                <span
                  className={`w-full text-base font-bold tracking-wide ${
                    useSwimlaneBoard ? "pr-8 text-left text-[#171c24]" : "pl-8 text-right text-[#ffffff]"
                  }`}
                >
                  {useSwimlaneBoard ? "ON" : "OFF"}
                </span>
                <span
                  className={`absolute top-1/2 h-7 w-7 -translate-y-1/2 rounded-full bg-white shadow transition ${
                    useSwimlaneBoard ? "right-2" : "left-2"
                  }`}
                />
              </button>
            </div>
          </aside>
        </div>
      </section>

      <section className="rounded-2xl border border-[#7a8798] bg-[#1f2630] p-6">
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#39e7ac]">Members</p>
            <h2 className="mt-2 text-xl font-bold text-[#ffffff]">Invite people to this project</h2>
          </div>
          <div className="rounded-xl border border-[#667386] bg-[#28313d] px-4 py-3 text-sm text-[#c3ceda]">
            Pending additions: <span className="font-semibold text-[#ffffff]">{selectedEmails.length}</span>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-4 rounded-2xl border border-[#667386] bg-[#28313d] p-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={emailQuery}
                onChange={(e) => setEmailQuery(e.target.value)}
                placeholder="name@example.com"
                className={`flex-1 ${inputClass}`}
              />
              <button
                type="button"
                onClick={handleAddEmail}
                className="rounded-lg border border-[#7a8798] px-5 py-3 text-sm font-semibold text-[#edf3fb] transition hover:bg-[#323d4b] hover:text-[#ffffff]"
              >
                Add email
              </button>
            </div>

            <div className="rounded-xl border border-dashed border-[#667386] px-4 py-10 text-center text-sm text-[#c3ceda]">
              Enter any email address. Existing users will get an in-app invite and email, and new users can register with that same email to claim the project invitation.
            </div>
          </div>

          <div className="rounded-2xl border border-[#667386] bg-[#28313d] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c3ceda]">Selected</p>
                <h3 className="mt-2 text-lg font-bold text-[#ffffff]">Ready to invite</h3>
              </div>
              <span className="rounded-full border border-[#667386] bg-[#1f2630] px-3 py-1 text-xs font-semibold text-[#c3ceda]">
                {selectedEmails.length}
              </span>
            </div>

            {selectedEmails.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#667386] px-4 py-10 text-center text-sm text-[#c3ceda]">
                Added people will appear here before you save.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedEmails.map((email) => (
                  <div
                    key={email}
                    className="flex flex-col gap-3 rounded-xl border border-[#7a8798] bg-[#1f2630] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#ffffff]">{email}</p>
                      <p className="truncate text-sm text-[#c3ceda]">Invitation will be sent to this email address.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="rounded-lg border border-[#ff4040]/30 px-4 py-2 text-sm text-[#ff8080] transition hover:bg-[#ff4040]/10"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#7a8798] bg-[#1f2630] p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#39e7ac]">Current Members</p>
          <h2 className="mt-2 text-xl font-bold text-[#ffffff]">Manage project members</h2>
        </div>

        {loadingMembers ? (
          <div className="text-sm text-[#c3ceda]">Loading members...</div>
        ) : members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#667386] px-4 py-10 text-center text-sm text-[#c3ceda]">
            No members found.
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id_user}
                className="flex items-center justify-between rounded-xl border border-[#7a8798] bg-[#28313d] px-4 py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-[#ffffff]">{member.name ?? "Unnamed"}</p>
                  <p className="text-sm text-[#c3ceda]">{member.email}</p>
                  {member.is_owner && <span className="text-xs text-[#39e7ac]">Owner</span>}
                </div>
                {!member.is_owner && (
                  <button
                    onClick={() => handleRemoveMember(member.id_user)}
                    className="rounded-lg border border-[#ff4040]/30 px-4 py-2 text-sm text-[#ff8080] transition hover:bg-[#ff4040]/10"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {error && (
        <p className="rounded-xl border border-[#ff4040]/20 bg-[#ff4040]/05 px-4 py-3 text-sm text-[#ff8080]">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-[#7a8798] bg-[#1f2630] p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c3ceda]">Actions</p>
            <p className="mt-2 text-sm text-[#c3ceda]">
              Save your changes once, or delete the project if it is no longer needed.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] px-6 py-3 text-sm font-bold text-[#39e7ac] transition hover:bg-[rgba(57,231,172,0.20)] disabled:opacity-50"
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
      </section>
    </div>
  );
}
