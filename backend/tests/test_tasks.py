from datetime import datetime, timedelta
from unittest.mock import MagicMock

import pytest
from hamcrest import assert_that, equal_to, has_key, contains_string

from app.models.task import Task
from app.models.task_workflow_status import TaskWorkflowStatus
from tests.conftest import make_execute_result, given, when, then


def _make_mock_member(project_id: int = 1):
    member = MagicMock()
    member.is_owner = True
    member.fk_userid_user = 1
    member.fk_projectid_project = project_id
    return member


def _make_mock_task(task_id: int = 10, project_id: int = 1, team_id=None, sprint_id=None):
    task = MagicMock(spec=Task)
    task.id_task = task_id
    task.name = "Sample Task"
    task.description = "A task description"
    task.story_points = 5.0
    task.risk = None
    task.priority = None
    task.fk_projectid_project = project_id
    task.fk_teamid_team = team_id
    task.fk_sprintid_sprint = sprint_id
    task.workflow_status = TaskWorkflowStatus.TODO.value
    task.board_order = 0
    return task


def _make_mock_team(team_id: int = 1, project_id: int = 1):
    team = MagicMock()
    team.id_team = team_id
    team.fk_projectid_project = project_id
    return team


def _make_mock_sprint(sprint_id: int = 1, team_id: int = 1, end_days_from_now: int = 7):
    sprint = MagicMock()
    sprint.id_sprint = sprint_id
    sprint.fk_teamid_team = team_id
    sprint.end_date = datetime.utcnow() + timedelta(days=end_days_from_now)
    return sprint


class TestCreateTask:

    async def test_create_task_returns_201_with_task_data(self, client, mock_db):
        with given("the user is a project member"):
            mock_member = _make_mock_member(project_id=1)
            mock_db.execute.return_value = make_execute_result(scalar=mock_member)

        with when("a valid task payload is submitted"):
            response = await client.post(
                "/api/tasks",
                json={
                    "name": "Implement login",
                    "description": "Build the login form",
                    "story_points": 3.0,
                    "fk_projectid_project": 1,
                },
            )

        with then("the server creates the task and returns 201"):
            assert_that(response.status_code, equal_to(201))
            body = response.json()
            assert_that(body, has_key("id_task"))
            assert_that(body["name"], equal_to("Implement login"))

    async def test_create_task_initial_status_is_todo(self, client, mock_db):
        with given("a valid task payload"):
            mock_db.execute.return_value = make_execute_result(scalar=_make_mock_member())

        with when("the task is created"):
            response = await client.post(
                "/api/tasks",
                json={"name": "New Task", "fk_projectid_project": 1},
            )

        with then("the workflow_status defaults to TODO"):
            assert_that(response.status_code, equal_to(201))
            assert_that(response.json()["workflow_status"], equal_to(TaskWorkflowStatus.TODO.value))

    async def test_create_task_with_empty_name_returns_400(self, client, mock_db):
        with given("the user is a member but the task name is whitespace only"):
            mock_db.execute.return_value = make_execute_result(scalar=_make_mock_member())

        with when("the empty-name payload is submitted"):
            response = await client.post(
                "/api/tasks",
                json={"name": "   ", "fk_projectid_project": 1},
            )

        with then("the server rejects it with 400"):
            assert_that(response.status_code, equal_to(400))
            assert_that(response.json()["detail"], contains_string("required"))

    async def test_create_task_without_membership_returns_404(self, client, mock_db):
        with given("the user is NOT a member of the project"):
            mock_db.execute.return_value = make_execute_result(scalar=None)

        with when("the task creation is attempted"):
            response = await client.post(
                "/api/tasks",
                json={"name": "Stealth Task", "fk_projectid_project": 99},
            )

        with then("the server returns 404"):
            assert_that(response.status_code, equal_to(404))


class TestDeleteTask:

    async def test_delete_existing_task_returns_200(self, client, mock_db):
        with given("the task exists and the user is a project member"):
            mock_task = _make_mock_task(task_id=10, project_id=1)
            mock_member = _make_mock_member(project_id=1)
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_task),
                make_execute_result(scalar=mock_member),
            ]

        with when("the delete endpoint is called"):
            response = await client.delete("/api/tasks/10")

        with then("the server confirms deletion"):
            assert_that(response.status_code, equal_to(200))
            body = response.json()
            assert_that(body["status"], equal_to("ok"))
            assert_that(body["task_id"], equal_to(10))

    async def test_delete_nonexistent_task_returns_404(self, client, mock_db):
        with given("no task exists with the given ID"):
            mock_db.execute.return_value = make_execute_result(scalar=None)

        with when("the delete endpoint is called with a phantom id"):
            response = await client.delete("/api/tasks/999")

        with then("404 Not Found"):
            assert_that(response.status_code, equal_to(404))

    async def test_delete_task_without_project_membership_returns_404(self, client, mock_db):
        with given("the task exists but the user is not a project member"):
            mock_task = _make_mock_task(task_id=10, project_id=1)
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_task),
                make_execute_result(scalar=None),
            ]

        with when("the delete is attempted"):
            response = await client.delete("/api/tasks/10")

        with then("404 via the project-not-found path"):
            assert_that(response.status_code, equal_to(404))


class TestAssignTeam:

    async def test_assign_task_to_team_returns_200(self, client, mock_db):
        with given("the task exists user is a member and the team belongs to the project"):
            mock_task = _make_mock_task(task_id=10, project_id=1, team_id=None)
            mock_member = _make_mock_member(project_id=1)
            mock_team = _make_mock_team(team_id=2, project_id=1)
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_task),
                make_execute_result(scalar=mock_member),
                make_execute_result(scalar=mock_team),
            ]

        with when("a team is assigned to the task"):
            response = await client.patch("/api/tasks/10/assign_team?team_id=2")

        with then("assignment succeeds"):
            assert_that(response.status_code, equal_to(200))
            body = response.json()
            assert_that(body["status"], equal_to("ok"))
            assert_that(body["task_id"], equal_to(10))

    async def test_assign_null_team_clears_sprint_and_resets_status(self, client, mock_db):
        with given("a task already assigned to a sprint and team"):
            mock_task = _make_mock_task(task_id=10, project_id=1, team_id=3, sprint_id=7)
            mock_member = _make_mock_member(project_id=1)
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_task),
                make_execute_result(scalar=mock_member),
            ]

        with when("the team is unassigned by setting team_id to null"):
            response = await client.patch("/api/tasks/10/assign_team?team_id=null")

        with then("assignment returns ok and team_id is None"):
            assert_that(response.status_code, equal_to(200))
            assert_that(response.json()["team_id"], equal_to(None))

    async def test_assign_nonexistent_task_returns_404(self, client, mock_db):
        with given("no task with the specified ID"):
            mock_db.execute.return_value = make_execute_result(scalar=None)

        with when("the assign-team endpoint is called"):
            response = await client.patch("/api/tasks/999/assign_team?team_id=1")

        with then("404"):
            assert_that(response.status_code, equal_to(404))


class TestAssignSprint:

    async def test_assign_sprint_returns_200(self, client, mock_db):
        with given("the task belongs to team 1 and the sprint belongs to team 1 and ends in the future"):
            mock_task = _make_mock_task(task_id=10, project_id=1, team_id=1)
            mock_member = _make_mock_member(project_id=1)
            mock_sprint = _make_mock_sprint(sprint_id=5, team_id=1, end_days_from_now=10)
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_task),
                make_execute_result(scalar=mock_member),
                make_execute_result(scalar=mock_sprint),
            ]

        with when("the sprint is assigned"):
            response = await client.patch(
                "/api/tasks/10/assign_sprint",
                json={"sprint_id": 5},
            )

        with then("assignment succeeds"):
            assert_that(response.status_code, equal_to(200))
            assert_that(response.json()["status"], equal_to("ok"))

    async def test_assign_sprint_that_ended_returns_400(self, client, mock_db):
        with given("the sprint end_date is in the past"):
            mock_task = _make_mock_task(task_id=10, project_id=1, team_id=1)
            mock_member = _make_mock_member(project_id=1)
            mock_sprint = MagicMock()
            mock_sprint.id_sprint = 5
            mock_sprint.fk_teamid_team = 1
            mock_sprint.end_date = datetime.utcnow() - timedelta(days=1)
            mock_sprint.end_date = mock_sprint.end_date.replace(tzinfo=None)
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_task),
                make_execute_result(scalar=mock_member),
                make_execute_result(scalar=mock_sprint),
            ]

        with when("the expired sprint is assigned"):
            response = await client.patch(
                "/api/tasks/10/assign_sprint",
                json={"sprint_id": 5},
            )

        with then("400 Bad Request"):
            assert_that(response.status_code, equal_to(400))
            assert_that(response.json()["detail"], contains_string("ended"))

    async def test_assign_sprint_from_different_team_returns_400(self, client, mock_db):
        with given("the task belongs to team 1 but the sprint belongs to team 2"):
            mock_task = _make_mock_task(task_id=10, project_id=1, team_id=1)
            mock_member = _make_mock_member(project_id=1)
            mock_sprint = _make_mock_sprint(sprint_id=5, team_id=2, end_days_from_now=10)
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_task),
                make_execute_result(scalar=mock_member),
                make_execute_result(scalar=mock_sprint),
            ]

        with when("the sprint from the wrong team is assigned"):
            response = await client.patch(
                "/api/tasks/10/assign_sprint",
                json={"sprint_id": 5},
            )

        with then("400 because sprint and task are in different teams"):
            assert_that(response.status_code, equal_to(400))
            assert_that(response.json()["detail"], contains_string("team"))

    async def test_unassign_sprint_returns_200(self, client, mock_db):
        with given("the task is currently in a sprint"):
            mock_task = _make_mock_task(task_id=10, project_id=1, team_id=1, sprint_id=5)
            mock_member = _make_mock_member(project_id=1)
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_task),
                make_execute_result(scalar=mock_member),
            ]

        with when("sprint_id is set to null"):
            response = await client.patch(
                "/api/tasks/10/assign_sprint",
                json={"sprint_id": None},
            )

        with then("the task is removed from the sprint"):
            assert_that(response.status_code, equal_to(200))
            assert_that(response.json()["sprint_id"], equal_to(None))


class TestUpdateBoardPosition:

    async def test_update_board_position_returns_200(self, client, mock_db):
        with given("a task that is assigned to a sprint"):
            mock_task = _make_mock_task(task_id=10, project_id=1, team_id=1, sprint_id=5)
            mock_member = _make_mock_member(project_id=1)
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_task),
                make_execute_result(scalar=mock_member),
            ]

        with when("the board position is updated"):
            response = await client.patch(
                "/api/tasks/10/board-position",
                json={"workflow_status": "IN_PROGRESS", "board_order": 2},
            )

        with then("the update succeeds"):
            assert_that(response.status_code, equal_to(200))
            body = response.json()
            assert_that(body["status"], equal_to("ok"))
            assert_that(body["task_id"], equal_to(10))

    async def test_update_board_position_with_negative_order_returns_400(self, client, mock_db):
        with given("a sprint task with a negative board_order in the payload"):
            mock_task = _make_mock_task(task_id=10, project_id=1, team_id=1, sprint_id=5)
            mock_member = _make_mock_member(project_id=1)
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_task),
                make_execute_result(scalar=mock_member),
            ]

        with when("a negative board_order is submitted"):
            response = await client.patch(
                "/api/tasks/10/board-position",
                json={"workflow_status": "TODO", "board_order": -1},
            )

        with then("the server rejects it with 400"):
            assert_that(response.status_code, equal_to(400))
            assert_that(response.json()["detail"], contains_string("zero or greater"))

    async def test_update_board_position_task_without_sprint_returns_400(self, client, mock_db):
        with given("a task that is NOT assigned to any sprint"):
            mock_task = _make_mock_task(task_id=10, project_id=1, team_id=1, sprint_id=None)
            mock_member = _make_mock_member(project_id=1)
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_task),
                make_execute_result(scalar=mock_member),
            ]

        with when("a board-position update is attempted on that task"):
            response = await client.patch(
                "/api/tasks/10/board-position",
                json={"workflow_status": "TODO", "board_order": 0},
            )

        with then("400 because only sprint tasks live on the board"):
            assert_that(response.status_code, equal_to(400))
            assert_that(response.json()["detail"], contains_string("sprint"))
