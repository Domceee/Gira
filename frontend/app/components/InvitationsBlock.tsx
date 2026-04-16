"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";

type InvitationItem = {
  id_invitation: number;
  fk_projectid_project: number;
  project_name: string;
  invited_by_name?: string;
  created_at: string;
};

export default function InvitationsBlock() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadInvitations() {
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch("/api/invitations", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to load invitations");
      }

      const data = (await res.json()) as InvitationItem[];
      setInvitations(data);
    } catch (err) {
      setError("Unable to load invitations.");
    } finally {
      setLoading(false);
    }
  }

  async function acceptInvitation(invitationId: number) {
    try {
      const res = await apiFetch(`/api/invitations/${invitationId}/accept`, {
        method: "PATCH",
      });

      if (!res.ok) {
        throw new Error("Failed to accept invitation");
      }

      setInvitations((current) => current.filter((item) => item.id_invitation !== invitationId));
      router.refresh();
    } catch {
      setError("Unable to accept the invitation. Please try again.");
    }
  }

  async function declineInvitation(invitationId: number) {
    try {
      const res = await apiFetch(`/api/invitations/${invitationId}/decline`, {
        method: "PATCH",
      });

      if (!res.ok) {
        throw new Error("Failed to decline invitation");
      }

      setInvitations((current) => current.filter((item) => item.id_invitation !== invitationId));
      router.refresh();
    } catch {
      setError("Unable to decline the invitation. Please try again.");
    }
  }

  useEffect(() => {
    loadInvitations();
  }, []);

  return (
    <aside className="rounded-2xl border border-[#b08968] bg-[#fffaf5] p-6 shadow-md">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-bold text-[#5c3b28]">Invitations</h2>
      </div>

      {loading ? (
        <p className="text-[#6f4e37]">Loading invitations…</p>
      ) : error ? (
        <p className="text-[#a33]">{error}</p>
      ) : invitations.length === 0 ? (
        <p className="text-[#6f4e37]">No pending invitations.</p>
      ) : (
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <article
              key={invitation.id_invitation}
              className="rounded-xl border border-[#d8b692] bg-[#fdf7f2] p-4"
            >
              <div className="mb-2">
                <h3 className="text-lg font-semibold text-[#7b4b2a]">
                  Invitation to {invitation.project_name}
                </h3>
                <p className="text-sm text-[#5a4335]">
                  Invited by {invitation.invited_by_name || "project owner"}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="text-xs text-[#8b6b4a]">
                  {new Date(invitation.created_at).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => declineInvitation(invitation.id_invitation)}
                    className="rounded-full border border-[#c75a4e] bg-white px-4 py-2 text-sm font-semibold text-[#c75a4e] transition hover:bg-[#f7e6e2]"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => acceptInvitation(invitation.id_invitation)}
                    className="rounded-full bg-[#8b5e3c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6a4329]"
                  >
                    Accept
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </aside>
  );
}
