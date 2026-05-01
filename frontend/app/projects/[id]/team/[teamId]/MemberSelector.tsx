"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

interface MemberSelectorProps {
  task: any;
  teamMembers: any[];
  apiUrl: string;
}

export default function MemberSelector({
  task,
  teamMembers,
  apiUrl
}: MemberSelectorProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const avatarRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const assigned = teamMembers.find(
    (m) => m.id_team_member === task.fk_team_memberid_team_member
  );

  return (
    <div className="relative">
      <button
        ref={avatarRef}
        onClick={() => {
          if (!avatarRef.current) return;

          const rect = avatarRef.current.getBoundingClientRect();
          setPos({ top: rect.bottom + 4, left: rect.left });
          setOpen(true);
        }}
      >
        {assigned?.user.picture ? (
          <img
            src={"data:image/jpeg;base64," + assigned.user.picture}
            className="h-7 w-7 rounded-full object-cover border border-[#7b8798]"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7a8798] text-[11px] font-semibold text-[#39e7ac]">
            {assigned?.user.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
      </button>

      {open &&
        createPortal(
          <div
            className="fixed z-50 w-48 rounded-lg border border-[#7a8798] bg-[#28313d] shadow-lg"
            style={{ top: pos.top, left: pos.left }}
          >
            <div className="max-h-60 overflow-y-auto py-1">
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#ffffff] hover:bg-[#323d4b]"
                onClick={async () => {
                  console.log("Assigning null");

                  await fetch(`${apiUrl}/api/tasks/${task.id_task}/assign_member`, {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ team_member_id: null })
                  });

                  setOpen(false);
                  router.refresh();
                }}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7a8798] text-[10px] font-semibold text-[#39e7ac]">
                  ?
                </div>
                Unassigned
              </button>

              {teamMembers.map((m) => (
                <button
                  key={m.id_team_member}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#ffffff] hover:bg-[#323d4b]"
                  onClick={async () => {
                    console.log("Assigning to", m.id_team_member);

                    await fetch(`${apiUrl}/api/tasks/${task.id_task}/assign_member`, {
                      method: "PATCH",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        team_member_id: m.id_team_member
                      })
                    });

                    setOpen(false);
                    router.refresh();
                  }}
                >
                  {m.user.picture ? (
                    <img
                      src={"data:image/jpeg;base64," + m.user.picture}
                      className="h-6 w-6 rounded-full object-cover border border-[#7b8798]"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7a8798] text-[10px] font-semibold text-[#39e7ac]">
                      {m.user.name[0].toUpperCase()}
                    </div>
                  )}
                  {m.user.name}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
