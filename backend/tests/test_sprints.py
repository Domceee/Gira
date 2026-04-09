from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest
from hamcrest import assert_that, equal_to, has_key, contains_string, has_length, greater_than

from app.models.sprint_status import SprintStatus
from app.models.sprint_task_event_type import SprintTaskEventType
from app.models.task_workflow_status import TaskWorkflowStatus
from tests.conftest import make_execute_result, given, when, then


def _make_mock_team(team_id: int = 1, project_id: int = 1):
    team = MagicMock()
    team.id_team = team_id
    team.fk_projectid_project = project_id
    return team


def _make_mock_member():
    member = MagicMock()
    member.is_owner = True
    member.fk_userid_user = 1
    member.fk_projectid_project = 1
    return member


def _make_mock_sprint(
    sprint_id: int = 1,
    team_id: int = 1,
    status: str = SprintStatus.PLANNED.value,
    start_offset: int = 1,
    end_offset: int = 7,
):
    sprint = MagicMock()
    sprint.id_sprint = sprint_id
    sprint.fk_teamid_team = team_id
    sprint.status = status
    sprint.start_date = datetime.now(timezone.utc) + timedelta(days=start_offset)
    sprint.end_date = datetime.now(timezone.utc) + timedelta(days=end_offset)
    return sprint


def _future_dates():
    start = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    end = (datetime.now(timezone.utc) + timedelta(days=8)).isoformat()
    return start, end


def _make_task(task_id: int, story_points: float, status: str = TaskWorkflowStatus.TODO.value):
    task = MagicMock()
    task.id_task = task_id
    task.story_points = story_points
    task.workflow_status = status
    task.completed_at = None
    return task


def _make_event(task_id: int, sprint_id: int, event_type: str, story_points: float, occurred_at: datetime, event_id: int):
    event = MagicMock()
    event.id_sprint_task_event = event_id
    event.fk_taskid_task = task_id
    event.fk_sprintid_sprint = sprint_id
    event.event_type = event_type
    event.story_points = story_points
    event.occurred_at = occurred_at
    return event


class TestCreateSprint:

    async def test_create_sprint_with_valid_dates_returns_200(self, client, mock_db):
        with given("the user is a team member and dates are valid"):
            mock_team = _make_mock_team()
            mock_member = _make_mock_member()
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_team),
                make_execute_result(scalar=mock_member),
            ]
            start, end = _future_dates()

        with when("a sprint with valid dates is submitted"):
            response = await client.post(
                "/api/sprints",
                json={"team_id": 1, "start_date": start, "end_date": end},
            )

        with then("the server creates the sprint and returns a dict with id_sprint"):
            assert_that(response.status_code, equal_to(200))
            body = response.json()
            assert_that(body, has_key("id_sprint"))
            assert_that(body["status"], equal_to("ok"))

    async def test_create_sprint_end_before_start_returns_400(self, client, mock_db):
        with given("end_date is earlier than start_date"):
            mock_team = _make_mock_team()
            mock_member = _make_mock_member()
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_team),
                make_execute_result(scalar=mock_member),
            ]
            start = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
            end = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()

        with when("the reversed dates are submitted"):
            response = await client.post(
                "/api/sprints",
                json={"team_id": 1, "start_date": start, "end_date": end},
            )

        with then("400 Bad Request with a clear message"):
            assert_that(response.status_code, equal_to(400))
            assert_that(response.json()["detail"], contains_string("end date"))

    async def test_create_sprint_end_in_past_returns_400(self, client, mock_db):
        with given("both dates are in the past"):
            mock_team = _make_mock_team()
            mock_member = _make_mock_member()
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_team),
                make_execute_result(scalar=mock_member),
            ]
            start = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
            end = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()

        with when("the expired dates are submitted"):
            response = await client.post(
                "/api/sprints",
                json={"team_id": 1, "start_date": start, "end_date": end},
            )

        with then("400 because the sprint would be entirely in the past"):
            assert_that(response.status_code, equal_to(400))
            assert_that(response.json()["detail"], contains_string("past"))

    async def test_create_sprint_for_nonexistent_team_returns_404(self, client, mock_db):
        with given("no team with the given ID exists"):
            mock_db.execute.return_value = make_execute_result(scalar=None)
            start, end = _future_dates()

        with when("a sprint is created for a phantom team"):
            response = await client.post(
                "/api/sprints",
                json={"team_id": 999, "start_date": start, "end_date": end},
            )

        with then("404 Not Found"):
            assert_that(response.status_code, equal_to(404))


class TestGetSprints:

    async def test_get_sprints_returns_empty_list_when_no_sprints(self, client, mock_db):
        with given("the team exists user is a member but the team has no sprints"):
            mock_team = _make_mock_team()
            mock_member = _make_mock_member()
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_team),
                make_execute_result(scalar=mock_member),
                make_execute_result(scalars_list=[]),
                make_execute_result(scalars_list=[]),
            ]

        with when("the sprint list is requested"):
            response = await client.get("/api/sprints?team_id=1")

        with then("an empty array is returned"):
            assert_that(response.status_code, equal_to(200))
            assert_that(response.json(), equal_to([]))

    async def test_get_sprints_nonexistent_team_returns_404(self, client, mock_db):
        with given("no team with this ID"):
            mock_db.execute.return_value = make_execute_result(scalar=None)

        with when("the sprint list is requested for an unknown team"):
            response = await client.get("/api/sprints?team_id=999")

        with then("404"):
            assert_that(response.status_code, equal_to(404))


class TestCloseSprint:

    async def test_close_sprint_with_no_unfinished_tasks_returns_200(self, client, mock_db):
        with given("an ACTIVE sprint with no unfinished tasks and no next sprint"):
            mock_sprint = _make_mock_sprint(sprint_id=1, status=SprintStatus.ACTIVE.value)
            mock_team = _make_mock_team()
            mock_member = _make_mock_member()
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_sprint),
                make_execute_result(scalar=mock_team),
                make_execute_result(scalar=mock_member),
                make_execute_result(scalars_list=[]),
                make_execute_result(scalar=None),
            ]

        with when("the sprint is closed"):
            response = await client.post("/api/sprints/1/close")

        with then("the server marks it COMPLETED and returns ok"):
            assert_that(response.status_code, equal_to(200))
            body = response.json()
            assert_that(body["status"], equal_to("ok"))
            assert_that(body["sprint_id"], equal_to(1))
            assert_that(body["sprint_status"], equal_to(SprintStatus.COMPLETED.value))

    async def test_close_sprint_moves_unfinished_tasks_to_next_sprint(self, client, mock_db):
        with given("an ACTIVE sprint with one unfinished task and a subsequent sprint"):
            mock_sprint = _make_mock_sprint(sprint_id=1, status=SprintStatus.ACTIVE.value)
            mock_team = _make_mock_team()
            mock_member = _make_mock_member()
            unfinished_task = MagicMock()
            unfinished_task.id_task = 42
            unfinished_task.workflow_status = TaskWorkflowStatus.IN_PROGRESS.value
            unfinished_task.board_order = 0
            next_sprint = _make_mock_sprint(sprint_id=2, start_offset=8, end_offset=15)
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_sprint),
                make_execute_result(scalar=mock_team),
                make_execute_result(scalar=mock_member),
                make_execute_result(scalars_list=[unfinished_task]),
                make_execute_result(scalar=next_sprint),
                make_execute_result(scalars_list=[]),
            ]

        with when("the sprint is closed"):
            response = await client.post("/api/sprints/1/close")

        with then("the unfinished task is listed as moved to the next sprint"):
            assert_that(response.status_code, equal_to(200))
            body = response.json()
            assert_that(body["target_sprint_id"], equal_to(2))
            assert_that(body["moved_task_ids"], has_length(1))
            assert_that(body["moved_task_ids"][0], equal_to(42))

    async def test_close_already_completed_sprint_returns_400(self, client, mock_db):
        with given("a sprint that is already COMPLETED"):
            mock_sprint = _make_mock_sprint(sprint_id=1, status=SprintStatus.COMPLETED.value)
            mock_team = _make_mock_team()
            mock_member = _make_mock_member()
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_sprint),
                make_execute_result(scalar=mock_team),
                make_execute_result(scalar=mock_member),
            ]

        with when("the close endpoint is called again"):
            response = await client.post("/api/sprints/1/close")

        with then("400 because the sprint is already done"):
            assert_that(response.status_code, equal_to(400))
            assert_that(response.json()["detail"], contains_string("already completed"))

    async def test_close_nonexistent_sprint_returns_404(self, client, mock_db):
        with given("no sprint with this ID"):
            mock_db.execute.return_value = make_execute_result(scalar=None)

        with when("the close endpoint is called"):
            response = await client.post("/api/sprints/999/close")

        with then("404 Not Found"):
            assert_that(response.status_code, equal_to(404))


class TestGetSprintStats:

    async def test_get_sprint_stats_returns_burndown_data(self, client, mock_db):
        with given("an ACTIVE sprint with two tasks totalling 8 story points"):
            mock_team = _make_mock_team()
            mock_member = _make_mock_member()
            mock_sprint = MagicMock()
            mock_sprint.id_sprint = 1
            mock_sprint.fk_teamid_team = 1
            mock_sprint.status = SprintStatus.ACTIVE.value
            mock_sprint.start_date = datetime.now(timezone.utc) - timedelta(days=2)
            mock_sprint.end_date = datetime.now(timezone.utc) + timedelta(days=5)
            task_a = _make_task(1, 5.0, TaskWorkflowStatus.DONE.value)
            task_a.completed_at = datetime.now(timezone.utc) - timedelta(days=1)
            task_b = _make_task(2, 3.0, TaskWorkflowStatus.TODO.value)
            event_a = _make_event(1, 1, SprintTaskEventType.ADDED.value, 5.0, mock_sprint.start_date, 1)
            event_b = _make_event(2, 1, SprintTaskEventType.ADDED.value, 3.0, mock_sprint.start_date, 2)
            event_c = _make_event(1, 1, SprintTaskEventType.COMPLETED.value, 5.0, task_a.completed_at, 3)
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_team),
                make_execute_result(scalar=mock_member),
                make_execute_result(scalars_list=[mock_sprint]),
                make_execute_result(scalar=mock_sprint),
                make_execute_result(scalars_list=[task_a, task_b]),
                make_execute_result(scalars_list=[event_a, event_b, event_c]),
            ]

        with when("the stats endpoint is called"):
            response = await client.get("/api/sprints/1/stats?team_id=1")

        with then("stats and burndown data are returned"):
            assert_that(response.status_code, equal_to(200))
            body = response.json()
            assert_that(body["committed_story_points"], equal_to(8.0))
            assert_that(body["committed_tasks"], equal_to(2))
            assert_that(body["completed_tasks"], equal_to(1))
            assert_that(body["remaining_tasks"], equal_to(1))
            assert_that(len(body["burndown_points"]), greater_than(0))
            assert_that(body["burndown_points"][0], has_key("actual_remaining_points"))

    async def test_get_sprint_stats_nonexistent_sprint_returns_404(self, client, mock_db):
        with given("the team exists and user is a member but the sprint does not"):
            mock_team = _make_mock_team()
            mock_member = _make_mock_member()
            mock_db.execute.side_effect = [
                make_execute_result(scalar=mock_team),
                make_execute_result(scalar=mock_member),
                make_execute_result(scalars_list=[]),
                make_execute_result(scalar=None),
            ]

        with when("the stats endpoint is called for an unknown sprint"):
            response = await client.get("/api/sprints/999/stats?team_id=1")

        with then("404"):
            assert_that(response.status_code, equal_to(404))
