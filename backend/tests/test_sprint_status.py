from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock

import pytest
from hamcrest import assert_that, equal_to

from app.models.sprint_status import SprintStatus
from app.services.sprint_status import get_runtime_sprint_status
from tests.conftest import given, when, then


def _make_sprint(start_offset_days: int, end_offset_days: int, status: str = SprintStatus.PLANNED.value):
    now = datetime.utcnow()
    sprint = MagicMock()
    sprint.start_date = now + timedelta(days=start_offset_days)
    sprint.end_date = now + timedelta(days=end_offset_days)
    sprint.status = status
    return sprint


class TestGetRuntimeSprintStatus:

    def test_completed_sprint_always_stays_completed(self):
        with given("a sprint whose persisted status is COMPLETED"):
            sprint = _make_sprint(start_offset_days=-10, end_offset_days=-5, status=SprintStatus.COMPLETED.value)

        with when("we compute the runtime status"):
            result = get_runtime_sprint_status(sprint)

        with then("the function always returns COMPLETED regardless of dates"):
            assert_that(result, equal_to(SprintStatus.COMPLETED.value))

    def test_planned_sprint_stays_planned_even_if_start_date_passed(self):
        with given("a sprint stored as PLANNED whose start_date is in the past"):
            sprint = _make_sprint(start_offset_days=-3, end_offset_days=4, status=SprintStatus.PLANNED.value)

        with when("we compute the runtime status"):
            result = get_runtime_sprint_status(sprint)

        with then("sprint stays PLANNED until manually started"):
            assert_that(result, equal_to(SprintStatus.PLANNED.value))

    def test_planned_sprint_stays_planned_when_future(self):
        with given("a sprint that starts tomorrow and ends in a week"):
            sprint = _make_sprint(start_offset_days=1, end_offset_days=7, status=SprintStatus.PLANNED.value)

        with when("we compute the runtime status"):
            result = get_runtime_sprint_status(sprint)

        with then("the sprint is not yet started so it stays PLANNED"):
            assert_that(result, equal_to(SprintStatus.PLANNED.value))

    def test_active_sprint_stays_active(self):
        with given("a sprint stored as ACTIVE"):
            sprint = _make_sprint(start_offset_days=-3, end_offset_days=4, status=SprintStatus.ACTIVE.value)

        with when("we compute the runtime status"):
            result = get_runtime_sprint_status(sprint)

        with then("the sprint remains ACTIVE"):
            assert_that(result, equal_to(SprintStatus.ACTIVE.value))
