import SprintRetrospective from "./SprintRetrospective";
import MemberRetrospective from "./MemberRetrospective";
import TeamMemberRetrosList from "./TeamMemberRetrosList";

import { checkTeamMembership, loadRetrospective } from "./actions";

type PageProps = {
  params: Promise<{
    id: string;
    teamId: string;
    sprintId: string;
  }>
};
export default async function RetrospectivePage(raw: { params: any }) {
  const params = Promise.resolve(raw.params); // force Promise

  const { id, teamId, sprintId } = await params;


  // 🔥 membership check now works 100% reliably
  const { is_member } = await checkTeamMembership({ teamId });

  // ❗ FIXED: correct argument name
  const sprint = await loadRetrospective({
    projectId: id,
    teamId,
    sprintId,
  });

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
      />

        <TeamMemberRetrosList
          projectId={id}
          teamId={teamId}
          sprintId={sprintId}
        />
    </div>
  );
}
