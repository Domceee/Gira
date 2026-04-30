"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { loadAllMemberRetrospectives } from "./actions";

/* ---------------------------------------------------------
   CHILD COMPONENT — SAFE HOOKS
--------------------------------------------------------- */
function MemberRow({ member }: { member: any }) {
  const [open, setOpen] = useState(false);

  let parsed: any = {};
  try {
    parsed = JSON.parse(member.description || "{}");
  } catch {
    parsed = {};
  }

  const columns = ["good", "bad", "ideas", "actions"];

  return (
    <div className="border border-[#7a8798] rounded-lg p-4 mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-md font-semibold text-[#edf3fb]"
      >
        {open ? <ChevronDown /> : <ChevronRight />}
        {member.member_name}
        {member.is_submitted && (
          <span className="ml-2 text-green-400 text-xs">(Submitted)</span>
        )}
      </button>

      {open && (
        <div className="grid grid-cols-4 gap-4 mt-4">
          {columns.map((col) => (
            <div key={col}>
              <div className="p-2 text-xs font-semibold uppercase tracking-wider text-[#c3ceda] bg-[#28313d]">
                {col.toUpperCase()}
              </div>

              {(parsed[col] || []).map((item: string, idx: number) => (
                <div
                  key={idx}
                  className="p-2 text-xs text-[#edf3fb] bg-[#1f2630] border-b border-[#3a4552]"
                >
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   MAIN COMPONENT
--------------------------------------------------------- */
export default function TeamMemberRetrosList({
  projectId,
  teamId,
  sprintId,
}: any) {
  const [open, setOpen] = useState(true);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const data = await loadAllMemberRetrospectives({
        projectId,
        teamId,
        sprintId,
      });
      setMembers(data || []);
    })();
  }, [projectId, teamId, sprintId]);

  return (
    <div className="rounded-xl border border-[#7a8798] bg-[#1f2630] p-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-lg font-semibold text-[#edf3fb] mb-4"
      >
        {open ? <ChevronDown /> : <ChevronRight />}
        Team Member Retrospectives
      </button>

      {open &&
        members.map((m) => (
          <MemberRow key={m.team_member_id} member={m} />
        ))}
    </div>
  );
}
