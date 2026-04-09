from enum import Enum


class SprintTaskEventType(str, Enum):
    ADDED = "ADDED"
    REMOVED = "REMOVED"
    COMPLETED = "COMPLETED"
    REOPENED = "REOPENED"
