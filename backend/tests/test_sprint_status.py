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


def _make_sprint_tz(start_offset_days: int, end_offset_days: int, status: str = SprintStatus.PLANNED.value):
    now = datetime.now(timezone.utc)
    sprint = MagicMock()
    sprint.start_date = now + timedelta(days=start_offset_days)
    sprint.end_date = now + timedelta(days=end_offset_days)
    sprint.status = status
    return sprint


class TestGetRuntimeSprintStatus:

    def test_completed_sprint_always_stays_completed(self):
        with given("a sprint whose persisted status is COMPLETED"):
            sprint = _make_sprint(start_offset_days=-10, end_offset_days=-5, status=SprintStatus.COMPLETED.value)
            now = datetime.utcnow()

        with when("we compute the runtime status"):
            result = get_runtime_sprint_status(sprint, now=now)

        with then("the function always returns COMPLETED regardless of dates"):
            assert_that(result, equal_to(SprintStatus.COMPLETED.value))

    def test_future_sprint_returns_planned(self):
        with given("a sprint that starts tomorrow and ends in a week"):
            sprint = _make_sprint(start_offset_days=1, end_offset_days=7)
            now = datetime.utcnow()

        with when("we compute the runtime status"):
            result = get_runtime_sprint_status(sprint, now=now)

        with then("the sprint is not yet started so it must be PLANNED"):
            assert_that(result, equal_to(SprintStatus.PLANNED.value))

    def test_sprint_that_started_today_returns_active(self):
        with given("a sprint whose start_date is exactly now"):
            now = datetime.utcnow()
            sprint = MagicMock()
            sprint.start_date = now
            sprint.end_date = now + timedelta(days=7)
            sprint.status = SprintStatus.PLANNED.value

        with when("we compute the runtime status using the same now"):
            result = get_runtime_sprint_status(sprint, now=now)

        with then("start_date <= now means the sprint is ACTIVE"):
            assert_that(result, equal_to(SprintStatus.ACTIVE.value))

    def test_sprint_started_yesterday_returns_active(self):
        with given("a sprint that started yesterday and ends tomorrow"):
            sprint = _make_sprint(start_offset_days=-1, end_offset_days=1)
            now = datetime.utcnow()

        with when("we compute the runtime status"):
            result = get_runtime_sprint_status(sprint, now=now)

        with then("the sprint is currently in progress"):
            assert_that(result, equal_to(SprintStatus.ACTIVE.value))

    def test_now_parameter_overrides_system_clock_to_before_start(self):
        with given("a sprint with fixed dates and an explicit now before the sprint"):
            sprint = MagicMock()
            sprint.start_date = datetime(2025, 6, 1)
            sprint.end_date = datetime(2025, 6, 14)
            sprint.status = SprintStatus.PLANNED.value
            fake_now = datetime(2025, 5, 31)

        with when("we pass that explicit now"):
            result = get_runtime_sprint_status(sprint, now=fake_now)

        with then("the sprint has not started from that point in time"):
            assert_that(result, equal_to(SprintStatus.PLANNED.value))

    def test_now_parameter_makes_same_sprint_active(self):
        with given("the same sprint but now is inside the sprint range"):
            sprint = MagicMock()
            sprint.start_date = datetime(2025, 6, 1)
            sprint.end_date = datetime(2025, 6, 14)
            sprint.status = SprintStatus.PLANNED.value
            fake_now = datetime(2025, 6, 7)

        with when("we compute the runtime status"):
            result = get_runtime_sprint_status(sprint, now=fake_now)

        with then("the sprint is active from this point in time"):
            assert_that(result, equal_to(SprintStatus.ACTIVE.value))

    def test_timezone_aware_sprint_uses_start_date_timezone(self):
        with given("a timezone-aware sprint that started an hour ago"):
            now_utc = datetime.now(timezone.utc)
            sprint = MagicMock()
            sprint.start_date = now_utc - timedelta(hours=1)
            sprint.end_date = now_utc + timedelta(days=7)
            sprint.status = SprintStatus.PLANNED.value

        with when("no explicit now is provided and function derives tz from sprint"):
            result = get_runtime_sprint_status(sprint)

        with then("since start_date is in the past status must be ACTIVE"):
            assert_that(result, equal_to(SprintStatus.ACTIVE.value))

    def test_timezone_aware_future_sprint_returns_planned(self):
        with given("a timezone-aware sprint that starts in 2 days"):
            sprint = _make_sprint_tz(start_offset_days=2, end_offset_days=9)

        with when("no explicit now is provided"):
            result = get_runtime_sprint_status(sprint)

        with then("sprint is in the future so it is PLANNED"):
            assert_that(result, equal_to(SprintStatus.PLANNED.value))
