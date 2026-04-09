import os
from contextlib import contextmanager

os.environ["APP_DATABASE_URL"] = "postgresql+asyncpg://test:test@localhost/testdb"
os.environ["SECRET_KEY"] = "testsecretkeytestsecretkey12345678"
os.environ["SMTP_HOST"] = "localhost"
os.environ["SMTP_PORT"] = "587"
os.environ["SMTP_USER"] = "test@test.com"
os.environ["SMTP_PASS"] = "testpassword"
os.environ["SMTP_FROM"] = "test@test.com"
os.environ["GOOGLE_CLIENT_ID"] = "test-google-client-id"
os.environ["GOOGLE_CLIENT_SECRET"] = "test-google-client-secret"
os.environ["GOOGLE_REDIRECT_URI"] = "http://localhost:8000/auth/google/callback"
os.environ["FRONTEND_URL"] = "http://localhost:3000"

import pytest
from unittest.mock import AsyncMock, MagicMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User

_PK_ATTRS = (
    "id_user",
    "id_project",
    "id_role",
    "id_task",
    "id_sprint",
    "id_team",
    "id_project_member",
    "id_team_member",
)


@contextmanager
def given(description: str = ""):
    yield


@contextmanager
def when(description: str = ""):
    yield


@contextmanager
def then(description: str = ""):
    yield


def make_execute_result(scalar=None, scalars_list=None, first_row=None):
    result = MagicMock()
    result.scalar_one_or_none.return_value = scalar
    result.first.return_value = first_row
    result.all.return_value = scalars_list if scalars_list is not None else []

    scalars_mock = MagicMock()
    scalars_mock.all.return_value = scalars_list if scalars_list is not None else []
    scalars_mock.first.return_value = scalar
    result.scalars.return_value = scalars_mock

    return result


@pytest.fixture
def mock_user():
    user = MagicMock(spec=User)
    user.id_user = 1
    user.name = "Test User"
    user.email = "test@example.com"
    user.country = "Poland"
    user.city = "Warsaw"
    user.password = "hashed_placeholder"
    user.auth_provider = "local"
    user.google_sub = None
    return user


@pytest.fixture
def mock_db():
    db = AsyncMock()
    _pending: list = []
    _counter = [1]

    def _assign_id(obj) -> None:
        for attr in _PK_ATTRS:
            if hasattr(obj, attr) and getattr(obj, attr) is None:
                setattr(obj, attr, _counter[0])
                _counter[0] += 1
                return

    def add_side_effect(obj) -> None:
        _pending.append(obj)

    async def flush_side_effect() -> None:
        for obj in list(_pending):
            _assign_id(obj)
        _pending.clear()

    async def refresh_side_effect(obj) -> None:
        for pending_obj in list(_pending):
            _assign_id(pending_obj)
        _pending.clear()
        _assign_id(obj)

    db.add = MagicMock(side_effect=add_side_effect)
    db.flush = AsyncMock(side_effect=flush_side_effect)
    db.commit = AsyncMock()
    db.refresh = AsyncMock(side_effect=refresh_side_effect)
    db.execute = AsyncMock(return_value=make_execute_result())
    db.delete = AsyncMock()

    return db


@pytest.fixture
async def client(mock_db, mock_user):
    async def override_get_db():
        yield mock_db

    async def override_get_current_user():
        return mock_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
