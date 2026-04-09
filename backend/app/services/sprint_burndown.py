from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from app.models.sprint_task_event import SprintTaskEvent
from app.models.sprint_task_event_type import SprintTaskEventType
from app.models.task import Task
from app.models.task_workflow_status import TaskWorkflowStatus
from app.schemas.sprint import BurndownPoint


@dataclass
class SprintTaskSummary:
    committed_tasks: int
    committed_story_points: float
    completed_tasks: int
    completed_story_points: float
    remaining_tasks: int
    remaining_story_points: float
    rolled_over_tasks: int
    rolled_over_story_points: float


def snapshot_story_points(task: Task) -> float:
    return float(task.story_points or 0.0)


def build_fallback_events(tasks: list[Task], sprint_start: datetime) -> list[SprintTaskEvent]:
    fallback_events: list[SprintTaskEvent] = []

    for task in tasks:
        fallback_events.append(
            SprintTaskEvent(
                fk_taskid_task=task.id_task,
                event_type=SprintTaskEventType.ADDED.value,
                story_points=snapshot_story_points(task),
                occurred_at=sprint_start,
            )
        )
        if task.workflow_status == TaskWorkflowStatus.DONE.value and task.completed_at is not None:
            fallback_events.append(
                SprintTaskEvent(
                    fk_taskid_task=task.id_task,
                    event_type=SprintTaskEventType.COMPLETED.value,
                    story_points=snapshot_story_points(task),
                    occurred_at=task.completed_at,
                )
            )

    return fallback_events


def build_burndown_points(
    sprint_start: datetime,
    sprint_end: datetime,
    events: list[SprintTaskEvent],
) -> list[BurndownPoint]:
    sprint_days = max((sprint_end.date() - sprint_start.date()).days + 1, 1)
    events_by_day: dict[date, list[SprintTaskEvent]] = {}

    for event in sorted(events, key=lambda item: (item.occurred_at, item.id_sprint_task_event or 0)):
        events_by_day.setdefault(event.occurred_at.date(), []).append(event)

    scope_points = 0.0
    completed_points = 0.0
    daily_snapshots: list[tuple[date, float, float]] = []

    for day_index in range(sprint_days):
        point_day = sprint_start.date() + timedelta(days=day_index)
        for event in events_by_day.get(point_day, []):
            if event.event_type == SprintTaskEventType.ADDED.value:
                scope_points += float(event.story_points or 0.0)
            elif event.event_type == SprintTaskEventType.REMOVED.value:
                scope_points -= float(event.story_points or 0.0)
            elif event.event_type == SprintTaskEventType.COMPLETED.value:
                completed_points += float(event.story_points or 0.0)
            elif event.event_type == SprintTaskEventType.REOPENED.value:
                completed_points -= float(event.story_points or 0.0)

        scope_points = max(scope_points, 0.0)
        completed_points = max(min(completed_points, scope_points), 0.0)
        daily_snapshots.append((point_day, round(scope_points, 2), round(completed_points, 2)))

    initial_scope = daily_snapshots[0][1] if daily_snapshots else 0.0
    planned_points_per_day = initial_scope / sprint_days if sprint_days else 0.0

    points: list[BurndownPoint] = []
    for day_index, (point_day, day_scope_points, day_completed_points) in enumerate(daily_snapshots):
        ideal_remaining = max(initial_scope - (planned_points_per_day * day_index), 0.0)
        actual_remaining = max(day_scope_points - day_completed_points, 0.0)
        points.append(
            BurndownPoint(
                label=f"Day {day_index + 1}",
                date=datetime.combine(point_day, time.min),
                ideal_remaining_points=round(ideal_remaining, 2),
                actual_remaining_points=round(actual_remaining, 2),
                scope_points=day_scope_points,
                completed_points=day_completed_points,
            )
        )

    return points


def summarize_sprint_tasks(events: list[SprintTaskEvent], current_tasks: list[Task]) -> SprintTaskSummary:
    current_tasks_by_id = {task.id_task: task for task in current_tasks}
    task_state: dict[int, dict[str, object]] = {}

    for event in sorted(events, key=lambda item: (item.occurred_at, item.id_sprint_task_event or 0)):
        state = task_state.setdefault(
            event.fk_taskid_task,
            {
                "ever_added": False,
                "in_scope": False,
                "completed": False,
                "story_points": 0.0,
            },
        )
        state["story_points"] = float(event.story_points or 0.0)

        if event.event_type == SprintTaskEventType.ADDED.value:
            state["ever_added"] = True
            state["in_scope"] = True
        elif event.event_type == SprintTaskEventType.REMOVED.value:
            state["in_scope"] = False
        elif event.event_type == SprintTaskEventType.COMPLETED.value:
            state["completed"] = True
        elif event.event_type == SprintTaskEventType.REOPENED.value:
            state["completed"] = False

    for task in current_tasks:
        state = task_state.setdefault(
            task.id_task,
            {
                "ever_added": True,
                "in_scope": True,
                "completed": task.workflow_status == TaskWorkflowStatus.DONE.value,
                "story_points": snapshot_story_points(task),
            },
        )
        state["ever_added"] = True
        state["in_scope"] = True
        state["completed"] = task.workflow_status == TaskWorkflowStatus.DONE.value
        state["story_points"] = snapshot_story_points(task)

    committed_tasks = 0
    committed_story_points = 0.0
    completed_tasks = 0
    completed_story_points = 0.0
    remaining_tasks = 0
    remaining_story_points = 0.0
    rolled_over_tasks = 0
    rolled_over_story_points = 0.0

    for task_id, state in task_state.items():
        if not state["ever_added"]:
            continue

        story_points = float(state["story_points"])
        committed_tasks += 1
        committed_story_points += story_points

        if state["in_scope"]:
            if state["completed"]:
                completed_tasks += 1
                completed_story_points += story_points
            else:
                remaining_tasks += 1
                remaining_story_points += story_points
        elif not state["completed"] and task_id not in current_tasks_by_id:
            rolled_over_tasks += 1
            rolled_over_story_points += story_points

    return SprintTaskSummary(
        committed_tasks=committed_tasks,
        committed_story_points=round(committed_story_points, 2),
        completed_tasks=completed_tasks,
        completed_story_points=round(completed_story_points, 2),
        remaining_tasks=remaining_tasks,
        remaining_story_points=round(remaining_story_points, 2),
        rolled_over_tasks=rolled_over_tasks,
        rolled_over_story_points=round(rolled_over_story_points, 2),
    )
