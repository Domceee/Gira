from unittest.mock import MagicMock

import pytest
from hamcrest import assert_that, equal_to, has_key, contains_string, has_length

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
