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
      const res = await apiFetch("/api/invitations", { method: "GET", cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load invitations");
      setInvitations(await res.json() as InvitationItem[]);
    } catch { setError("Unable to load invitations."); }
    finally { setLoading(false); }
  }

  async function acceptInvitation(id: number) {
    try {
      const res = await apiFetch(`/api/invitations/${id}/accept`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      setInvitations((c) => c.filter((i) => i.id_invitation !== id));
      router.refresh();
    } catch { setError("Unable to accept the invitation."); }
  }

  async function declineInvitation(id: number) {
    try {
      const res = await apiFetch(`/api/invitations/${id}/decline`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      setInvitations((c) => c.filter((i) => i.id_invitation !== id));
      router.refresh();
    } catch { setError("Unable to decline the invitation."); }
  }

  useEffect(() => { loadInvitations(); }, []);

  return (
    <aside className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-6">
      <h2 className="mb-4 text-base font-bold text-[#f0f0f0]">Invitations</h2>

      {loading ? (
        <p className="text-sm text-[#444]">Loading…</p>
      ) : error ? (
        <p className="text-sm text-[#ff8080]">{error}</p>
      ) : invitations.length === 0 ? (
        <p className="text-sm text-[#444]">No pending invitations.</p>
      ) : (
        <div className="space-y-3">
          {invitations.map((inv) => (
            <article key={inv.id_invitation} className="rounded-lg border border-[#1e1e1e] bg-[#111] p-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-[#f0f0f0]">{inv.project_name}</h3>
                <p className="text-xs text-[#555]">Invited by {inv.invited_by_name || "project owner"}</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-[#444]">{new Date(inv.created_at).toLocaleDateString()}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => declineInvitation(inv.id_invitation)}
                    className="rounded-lg border border-[#ff4040]/30 px-3 py-1.5 text-xs font-semibold text-[#ff8080] transition hover:bg-[#ff4040]/10">
                    Decline
                  </button>
                  <button type="button" onClick={() => acceptInvitation(inv.id_invitation)}
                    className="rounded-lg border border-[rgba(57,255,20,0.3)] bg-[rgba(57,255,20,0.08)] px-3 py-1.5 text-xs font-semibold text-[#39ff14] transition hover:bg-[rgba(57,255,20,0.14)]">
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
