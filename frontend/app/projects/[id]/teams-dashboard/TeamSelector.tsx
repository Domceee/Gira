"use client";

type Team = {
  id_team: number;
  name: string | null;
};

type TeamSelectorProps = {
  teams: Team[];
  selectedTeamId: number | null;
  onSelect: (id: number) => void;
};

export default function TeamSelector({ teams, selectedTeamId, onSelect }: TeamSelectorProps) {
  return (
    <div className="flex gap-4 flex-wrap mb-8">
      {teams.map((team) => (
        <button
          key={team.id_team}
          onClick={() => onSelect(team.id_team)}
          className={`px-4 py-2 rounded-xl border ${
            selectedTeamId === team.id_team
              ? "bg-[#b08968] text-white"
              : "bg-[#fdf7f2] text-[#4b2e1f]"
          }`}
        >
          {team.name ?? "Unnamed team"}
        </button>
      ))}
    </div>
  );
}
