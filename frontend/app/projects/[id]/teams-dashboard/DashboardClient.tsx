"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TeamSelector from "./TeamSelector";

type DashboardClientProps = {
  projectId: string;
  teams: { id_team: number; name: string | null }[];
};

export default function DashboardClient({ projectId, teams }: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTeam = searchParams.get("team");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(
    initialTeam ? Number(initialTeam) : null
  );


  useEffect(() => {
    if (selectedTeamId === null) return;

    const newUrl = `/projects/${projectId}/teams-dashboard?team=${selectedTeamId}`;
    router.push(newUrl);
  }, [selectedTeamId, projectId, router]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <TeamSelector
        teams={teams}
        selectedTeamId={selectedTeamId}
        onSelect={setSelectedTeamId}
      />
    </div>
  );
}
