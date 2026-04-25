from unittest.mock import MagicMock

import pytest
from hamcrest import assert_that, equal_to, has_key, contains_string, has_length
from datetime import datetime, timezone
from app.models.task_workflow_status import TaskWorkflowStatus
from app.models.sprint_status import SprintStatus

from tests.conftest import make_execute_result, given, when, then


def _make_mock_member(is_owner: bool = True):
    member = MagicMock()
    member.is_owner = is_owner
    member.fk_userid_user = 1
    member.fk_projectid_project = 1
    return member


def _make_mock_project(project_id: int = 1, name: str = "My Project"):
    project = MagicMock()
    project.id_project = project_id
    project.name = name
    project.description = "A test project"
    return project


def _make_mock_team(team_id: int = 1, name: str = "Alpha"):
    team = MagicMock()
    team.id_team = team_id
    team.name = name
    team.fk_projectid_project = 1
    return team


def _make_mock_task(
    task_id: int,
    *,
    team_id: int | None = None,
    sprint_id: int | None = None,
    status: str = TaskWorkflowStatus.TODO.value,
    story_points: float = 1.0,
):
    task = MagicMock()
    task.id_task = task_id
    task.fk_teamid_team = team_id
    task.fk_sprintid_sprint = sprint_id
    task.workflow_status = status
    task.story_points = story_points
    return task


def _make_mock_sprint(
    sprint_id: int,
    *,
    team_id: int,
    status: str = SprintStatus.COMPLETED.value,
):
    sprint = MagicMock()
    sprint.id_sprint = sprint_id
    sprint.fk_teamid_team = team_id
    sprint.status = status
    sprint.start_date = datetime(2026, 1, 1, tzinfo=timezone.utc)
    sprint.end_date = datetime(2026, 1, 14, tzinfo=timezone.utc)
    return sprint


class TestCreateProject:

    async def test_create_project_with_valid_name_returns_201(self, client, mock_db):
        with given("an authenticated owner and no pre-existing DB state needed"):
            pass

        with when("a valid project payload is submitted"):
            response = await client.post(
                "/api/projects",
                json={"name": "New Project", "description": "A brand new project"},
            )

        with then("the server creates the project and returns 201"):
            assert_that(response.status_code, equal_to(201))
            body = response.json()
            assert_that(body, has_key("id"))
            assert_that(body["name"], equal_to("New Project"))

    async def test_create_project_returns_can_delete_true(self, client, mock_db):
        with given("a fresh project has no teams or tasks yet"):
            pass

        with when("the project is created"):
            response = await client.post(
                "/api/projects",
                json={"name": "Clean Project"},
            )

        with then("the response signals the project can be deleted immediately"):
            body = response.json()
            assert_that(body["can_delete"], equal_to(True))

    async def test_create_project_with_dot_name_returns_400(self, client, mock_db):
        with given("the reserved name dot which the route explicitly forbids"):
            pass

        with when("the payload is submitted"):
            response = await client.post("/api/projects", json={"name": "."})

        with then("the server rejects it with 400 Bad Request"):
            assert_that(response.status_code, equal_to(400))
            assert_that(response.json()["detail"], contains_string("Invalid project name"))

    async def test_create_project_with_empty_name_returns_400(self, client, mock_db):
        with given("a name that becomes empty after stripping whitespace"):
            pass

        with when("the payload is submitted"):
            response = await client.post("/api/projects", json={"name": "   "})

        with then("400 because the stripped name is falsy"):
            assert_that(response.status_code, equal_to(400))

    async def test_create_project_with_ellipsis_name_returns_400(self, client, mock_db):
        with given("the name ... which is in the reserved set"):
            pass

        with when("the payload is submitted"):
            response = await client.post("/api/projects", json={"name": "..."})

        with then("the server rejects it with 400"):
            assert_that(response.status_code, equal_to(400))


class TestGetProjects:

    async def test_get_projects_returns_200_with_empty_list(self, client, mock_db):
        with given("the user is a member of no projects"):
            mock_db.execute.return_value = make_execute_result(scalars_list=[])

        with when("the project list is requested"):
            response = await client.get("/api/projects")

        with then("the server returns 200 with an empty array"):
            assert_that(response.status_code, equal_to(200))
            assert_that(response.json(), equal_to([]))

    async def test_get_projects_returns_all_owned_projects(self, client, mock_db):
        with given("the user owns two projects"):
            project_a = _make_mock_project(project_id=1, name="Alpha")
            project_b = _make_mock_project(project_id=2, name="Beta")
            mock_db.execute.side_effect = [
                make_execute_result(scalars_list=[project_a, project_b]),
                make_execute_result(scalars_list=[]),
                make_execute_result(scalars_list=[]),
                make_execute_result(scalars_list=[]),
                make_execute_result(scalars_list=[]),
            ]

        with when("the project list is requested"):
            response = await client.get("/api/projects")

        with then("both projects appear in the response"):
            assert_that(response.status_code, equal_to(200))
            assert_that(response.json(), has_length(2))


class TestGetProject:

    async def test_get_project_returns_200_with_project_data(self, client, mock_db):
        with given("the project exists and the user is a member"):
            mock_project = _make_mock_project(project_id=1, name="Flagship")
            mock_db.execute.side_effect = [
                make_execute_result(first_row=(mock_project, True)),
                make_execute_result(scalars_list=[]),
                make_execute_result(scalars_list=[]),
            ]

        with when("the single-project endpoint is called"):
            response = await client.get("/api/projects/1")

        with then("the server returns the project details"):
            assert_that(response.status_code, equal_to(200))
            body = response.json()
            assert_that(body["name"], equal_to("Flagship"))
            assert_that(body["is_owner"], equal_to(True))

    async def test_get_project_not_found_returns_404(self, client, mock_db):
        with given("no membership row exists for this user and project"):
            mock_db.execute.return_value = make_execute_result(first_row=None)

        with when("the endpoint is called with an unknown id"):
            response = await client.get("/api/projects/999")

        with then("the server returns 404 Not Found"):
            assert_that(response.status_code, equal_to(404))

    async def test_get_project_with_teams_cannot_be_deleted(self, client, mock_db):
        with given("the project exists and has one team"):
            mock_project = _make_mock_project(project_id=1, name="Flagship")
            mock_team = _make_mock_team()
            mock_db.execute.side_effect = [
                make_execute_result(first_row=(mock_project, True)),
                make_execute_result(scalars_list=[mock_team]),
                make_execute_result(scalars_list=[]),
            ]

        with when("the single-project endpoint is called"):
            response = await client.get("/api/projects/1")

        with then("can_delete is False and a reason is included"):
            body = response.json()
            assert_that(body["can_delete"], equal_to(False))
            assert_that(body["delete_block_reason"], contains_string("team"))


class TestUpdateProject:

    async def test_update_project_name_returns_200(self, client, mock_db):
        with given("the user is the project owner"):
            mock_member = _make_mock_member(is_owner=True)
            mock_project = _make_mock_project(project_id=1, name="Old Name")
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_member),
                make_execute_result(scalar=mock_project),
                make_execute_result(scalars_list=[]),
                make_execute_result(scalars_list=[]),
            ]

        with when("the name is updated"):
            response = await client.patch(
                "/api/projects/1",
                json={"name": "New Name", "description": "Updated description"},
            )

        with then("the server returns 200 with the updated project"):
            assert_that(response.status_code, equal_to(200))
            assert_that(response.json()["name"], equal_to("New Name"))

    async def test_update_project_as_non_owner_returns_403(self, client, mock_db):
        with given("the requesting user is a regular member not an owner"):
            mock_member = _make_mock_member(is_owner=False)
            mock_db.execute.return_value = make_execute_result(scalar=mock_member)

        with when("the update is attempted"):
            response = await client.patch(
                "/api/projects/1",
                json={"name": "Attempted Rename"},
            )

        with then("the server refuses with 403 Forbidden"):
            assert_that(response.status_code, equal_to(403))


class TestGetProjectStats:

    async def test_get_project_stats_excludes_done_tasks_from_active_buckets(self, client, mock_db):
        with given("a project with active and completed tasks across multiple buckets"):
            mock_member = _make_mock_member()
            team = _make_mock_team(team_id=7, name="Alpha")
            tasks = [
                _make_mock_task(1, team_id=None, sprint_id=None, status=TaskWorkflowStatus.TODO.value, story_points=2.0),
                _make_mock_task(2, team_id=7, sprint_id=None, status=TaskWorkflowStatus.IN_PROGRESS.value, story_points=3.0),
                _make_mock_task(3, team_id=7, sprint_id=5, status=TaskWorkflowStatus.IN_REVIEW.value, story_points=5.0),
                _make_mock_task(4, team_id=7, sprint_id=5, status=TaskWorkflowStatus.DONE.value, story_points=8.0),
            ]
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_member),
                make_execute_result(scalars_list=tasks),
                make_execute_result(scalars_list=[team]),
            ]

        with when("the project stats endpoint is requested"):
            response = await client.get("/api/projects/1/stats")

        with then("done work is separated and active buckets only include unfinished tasks"):
            assert_that(response.status_code, equal_to(200))
            body = response.json()
            assert_that(body["total_tasks"], equal_to(4))
            assert_that(body["active_tasks"], equal_to(3))
            assert_that(body["done_tasks"], equal_to(1))
            assert_that(body["unassigned_tasks"], equal_to(1))
            assert_that(body["team_backlog_tasks"], equal_to(1))
            assert_that(body["in_sprint_tasks"], equal_to(1))
            assert_that(body["done_story_points"], equal_to(8.0))

    async def test_get_project_stats_returns_team_velocity_for_selected_team(self, client, mock_db):
        with given("a team with more than seven completed sprints and no explicit sprint events"):
            mock_member = _make_mock_member()
            team = _make_mock_team(team_id=7, name="Alpha")
            sprints = []
            execute_results = [
                make_execute_result(scalar=mock_member),
                make_execute_result(scalars_list=[]),
                make_execute_result(scalars_list=[team]),
            ]

            for sprint_id in range(8, 0, -1):
                sprint = _make_mock_sprint(sprint_id, team_id=7)
                sprint.end_date = datetime(2026, 1, sprint_id, tzinfo=timezone.utc)
                sprints.append(sprint)

            execute_results.append(make_execute_result(scalars_list=sprints))

            for sprint in reversed(sprints[:7]):
                sprint_tasks = [
                    _make_mock_task(
                        sprint.id_sprint * 10 + 1,
                        team_id=7,
                        sprint_id=sprint.id_sprint,
                        status=TaskWorkflowStatus.DONE.value,
                        story_points=float(sprint.id_sprint),
                    ),
                    _make_mock_task(
                        sprint.id_sprint * 10 + 2,
                        team_id=7,
                        sprint_id=sprint.id_sprint,
                        status=TaskWorkflowStatus.TODO.value,
                        story_points=1.0,
                    ),
                ]
                execute_results.append(make_execute_result(scalars_list=sprint_tasks))
                execute_results.append(make_execute_result(scalars_list=[]))

            mock_db.execute.side_effect = execute_results

        with when("project stats are requested for that team"):
            response = await client.get("/api/projects/1/stats?team_id=7")

        with then("the payload includes a rolling window of the latest seven completed sprints ordered oldest to newest"):
            assert_that(response.status_code, equal_to(200))
            body = response.json()
            assert_that(body["selected_team_id"], equal_to(7))
            assert_that(body["teams"], has_length(1))
            assert_that(body["velocity_report"], has_length(7))
            assert_that([item["sprint_id"] for item in body["velocity_report"]], equal_to([2, 3, 4, 5, 6, 7, 8]))
            assert_that(body["velocity_report"][0]["committed_story_points"], equal_to(3.0))
            assert_that(body["velocity_report"][0]["completed_story_points"], equal_to(2.0))
            assert_that(body["velocity_report"][-1]["committed_story_points"], equal_to(9.0))
            assert_that(body["velocity_report"][-1]["completed_story_points"], equal_to(8.0))


class TestDeleteProject:

    async def test_delete_project_returns_200_with_message(self, client, mock_db):
        with given("the user is the owner and the project has no dependent entities"):
            mock_member = _make_mock_member(is_owner=True)
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_member),
                MagicMock(),
                MagicMock(),
                MagicMock(),
            ]

        with when("the delete endpoint is called"):
            response = await client.delete("/api/projects/1")

        with then("the server confirms deletion"):
            assert_that(response.status_code, equal_to(200))
            assert_that(response.json(), has_key("message"))

    async def test_delete_project_as_non_owner_returns_403(self, client, mock_db):
        with given("the requesting user is not the owner"):
            mock_member = _make_mock_member(is_owner=False)
            mock_db.execute.return_value = make_execute_result(scalar=mock_member)

        with when("deletion is attempted"):
            response = await client.delete("/api/projects/1")

        with then("403 Forbidden"):
            assert_that(response.status_code, equal_to(403))


class TestCreateTeam:

    async def test_create_team_with_valid_name_returns_201(self, client, mock_db):
        with given("the user is the project owner"):
            mock_member = _make_mock_member(is_owner=True)
            mock_db.execute.return_value = make_execute_result(scalar=mock_member)

        with when("a team with a valid name is created"):
            response = await client.post(
                "/api/projects/1/teams",
                json={"name": "Alpha Team"},
            )

        with then("the server creates the team and returns 201"):
            assert_that(response.status_code, equal_to(201))
            body = response.json()
            assert_that(body["name"], equal_to("Alpha Team"))
            assert_that(body["can_delete"], equal_to(True))

    async def test_create_team_with_empty_name_returns_400(self, client, mock_db):
        with given("the user is the owner but provides a blank name"):
            mock_member = _make_mock_member(is_owner=True)
            mock_db.execute.return_value = make_execute_result(scalar=mock_member)

        with when("the team is submitted with an empty name"):
            response = await client.post(
                "/api/projects/1/teams",
                json={"name": "   "},
            )

        with then("400 Bad Request because the stripped name is empty"):
            assert_that(response.status_code, equal_to(400))
            assert_that(response.json()["detail"], contains_string("required"))

    async def test_create_team_as_non_owner_returns_403(self, client, mock_db):
        with given("the requesting user is just a member"):
            mock_member = _make_mock_member(is_owner=False)
            mock_db.execute.return_value = make_execute_result(scalar=mock_member)

        with when("the team creation is attempted"):
            response = await client.post(
                "/api/projects/1/teams",
                json={"name": "Sneaky Team"},
            )

        with then("403 Forbidden"):
            assert_that(response.status_code, equal_to(403))


class TestDeleteTeam:

    async def test_delete_empty_team_returns_200(self, client, mock_db):
        with given("the user is the owner and the team has no tasks or sprints"):
            mock_member = _make_mock_member(is_owner=True)
            mock_team = _make_mock_team(team_id=5)
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_member),
                make_execute_result(scalar=mock_team),
                MagicMock(),
                MagicMock(),
            ]

        with when("the delete endpoint is called"):
            response = await client.delete("/api/projects/1/teams/5")

        with then("the server confirms deletion"):
            assert_that(response.status_code, equal_to(200))
            assert_that(response.json(), has_key("message"))

    async def test_delete_nonexistent_team_returns_404(self, client, mock_db):
        with given("the user is the owner but the team does not exist"):
            mock_member = _make_mock_member(is_owner=True)
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_member),
                make_execute_result(scalar=None),
            ]

        with when("the delete is attempted for an unknown team"):
            response = await client.delete("/api/projects/1/teams/999")

        with then("404 Not Found"):
            assert_that(response.status_code, equal_to(404))


class TestGetProjectTeams:

    async def test_get_teams_returns_empty_list(self, client, mock_db):
        with given("the user is a member of the project but the project has no teams"):
            mock_member = _make_mock_member()
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_member),
                make_execute_result(scalars_list=[]),
            ]

        with when("the teams endpoint is called"):
            response = await client.get("/api/projects/1/teams")

        with then("an empty array is returned"):
            assert_that(response.status_code, equal_to(200))
            assert_that(response.json(), equal_to([]))

    async def test_get_teams_returns_list_of_teams(self, client, mock_db):
        with given("the project has two teams"):
            mock_member = _make_mock_member()
            team_a = _make_mock_team(team_id=1, name="Alpha")
            team_b = _make_mock_team(team_id=2, name="Beta")
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_member),
                make_execute_result(scalars_list=[team_a, team_b]),
                make_execute_result(scalars_list=[]),
                make_execute_result(scalars_list=[]),
                make_execute_result(scalars_list=[]),
                make_execute_result(scalars_list=[]),
            ]

        with when("the teams endpoint is called"):
            response = await client.get("/api/projects/1/teams")

        with then("both teams are returned"):
            assert_that(response.status_code, equal_to(200))
            assert_that(response.json(), has_length(2))
