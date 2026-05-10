import SprintRetrospective from "./SprintRetrospective";
import MemberRetrospective from "./MemberRetrospective";
import TeamMemberRetrosList from "./TeamMemberRetrosList";

import { checkTeamMembership, loadRetrospective } from "./actions";
import { apiFetch } from "@/app/lib/api";

export default async function RetrospectivePage(raw: { params: any }) {
  const params = Promise.resolve(raw.params);

  const { id, teamId, sprintId } = await params;

  const [{ is_member }, sprint, projectData] = await Promise.all([
    checkTeamMembership({ teamId }),
    loadRetrospective({ projectId: id, teamId, sprintId }),
    apiFetch(`/api/projects/${id}`, { cache: "no-store" }).then((r) =>
      r.ok ? r.json() : { is_owner: false }
    ),
  ]);

  const isOwner: boolean = projectData.is_owner ?? false;

  return (
    <div className="space-y-8 p-6">
      {is_member && (
        <MemberRetrospective
          projectId={id}
          teamId={teamId}
          sprintId={sprintId}
          sprintFinished={sprint?.is_finished}
        />
      )}

      <SprintRetrospective
        projectId={id}
        teamId={teamId}
        sprintId={sprintId}
        isOwner={isOwner}
      />

        <TeamMemberRetrosList
          projectId={id}
          teamId={teamId}
          sprintId={sprintId}
        />
    </div>
  );
}
