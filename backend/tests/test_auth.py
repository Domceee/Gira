from unittest.mock import MagicMock, patch, AsyncMock

import pytest
from hamcrest import assert_that, equal_to, has_key, contains_string

from tests.conftest import make_execute_result, given, when, then


class TestRegister:

    async def test_register_new_user_returns_201(self, client, mock_db):
        with given("no existing user with this email"):
            mock_db.execute.return_value = make_execute_result(scalar=None)

        with when("a valid registration payload is submitted"):
            with patch("app.api.routes.auth.send_registration_email", new_callable=AsyncMock):
                response = await client.post(
                    "/auth/register",
                    json={
                        "name": "Alice",
                        "email": "alice@example.com",
                        "password": "password123",
                        "country": "Poland",
                        "city": "Warsaw",
                    },
                )

        with then("the server creates the user and returns 201 with the user payload"):
            assert_that(response.status_code, equal_to(201))
            body = response.json()
            assert_that(body, has_key("email"))
            assert_that(body["email"], equal_to("alice@example.com"))

    async def test_register_duplicate_email_returns_409(self, client, mock_db):
        with given("a user with that email already exists in the database"):
            existing_user = MagicMock()
            existing_user.email = "alice@example.com"
            mock_db.execute.return_value = make_execute_result(scalar=existing_user)

        with when("the same email is submitted again"):
            with patch("app.api.routes.auth.send_registration_email", new_callable=AsyncMock):
                response = await client.post(
                    "/auth/register",
                    json={
                        "name": "Alice Again",
                        "email": "alice@example.com",
                        "password": "password123",
                        "country": "Poland",
                        "city": "Warsaw",
                    },
                )

        with then("the server rejects the request with a 409 Conflict"):
            assert_that(response.status_code, equal_to(409))
            assert_that(response.json()["detail"], contains_string("already registered"))

    async def test_register_background_email_is_scheduled(self, client, mock_db):
        with given("no existing user"):
            mock_db.execute.return_value = make_execute_result(scalar=None)

        with when("registration is submitted"):
            with patch("app.api.routes.auth.send_registration_email", new_callable=AsyncMock) as mock_email:
                await client.post(
                    "/auth/register",
                    json={
                        "name": "Bob",
                        "email": "bob@example.com",
                        "password": "password123",
                        "country": "UK",
                        "city": "London",
                    },
                )

        with then("a background email task was enqueued exactly once"):
            assert_that(mock_email.call_count, equal_to(1))


class TestLogin:

    async def test_login_with_valid_credentials_returns_200_and_sets_cookie(self, client, mock_db, mock_user):
        with given("a user exists and the supplied password matches"):
            mock_db.execute.return_value = make_execute_result(scalar=mock_user)

        with when("the correct credentials are submitted"):
            with patch("app.api.routes.auth.verify_password", return_value=True):
                response = await client.post(
                    "/auth/login",
                    json={"email": "test@example.com", "password": "password123"},
                )

        with then("the server responds 200 and sets an access_token cookie"):
            assert_that(response.status_code, equal_to(200))
            assert_that("access_token" in response.cookies, equal_to(True))

    async def test_login_user_not_found_returns_401(self, client, mock_db):
        with given("no user exists for the supplied email"):
            mock_db.execute.return_value = make_execute_result(scalar=None)

        with when("login is attempted"):
            response = await client.post(
                "/auth/login",
                json={"email": "nobody@example.com", "password": "password123"},
            )

        with then("the server returns 401 Unauthorized"):
            assert_that(response.status_code, equal_to(401))

    async def test_login_google_user_without_password_returns_401(self, client, mock_db, mock_user):
        with given("the user was registered via Google and has no local password"):
            mock_user.password = None
            mock_db.execute.return_value = make_execute_result(scalar=mock_user)

        with when("a password-based login is attempted for that user"):
            response = await client.post(
                "/auth/login",
                json={"email": "test@example.com", "password": "password123"},
            )

        with then("the server explains the user must log in via Google"):
            assert_that(response.status_code, equal_to(401))
            assert_that(response.json()["detail"], contains_string("Google"))

    async def test_login_wrong_password_returns_401(self, client, mock_db, mock_user):
        with given("the user exists but the supplied password is incorrect"):
            mock_db.execute.return_value = make_execute_result(scalar=mock_user)

        with when("login is attempted with the wrong password"):
            with patch("app.api.routes.auth.verify_password", return_value=False):
                response = await client.post(
                    "/auth/login",
                    json={"email": "test@example.com", "password": "wrongpassword"},
                )

        with then("the server returns 401 Unauthorized"):
            assert_that(response.status_code, equal_to(401))

    async def test_login_response_body_contains_user_fields(self, client, mock_db, mock_user):
        with given("valid credentials for an existing user"):
            mock_db.execute.return_value = make_execute_result(scalar=mock_user)

        with when("login succeeds"):
            with patch("app.api.routes.auth.verify_password", return_value=True):
                response = await client.post(
                    "/auth/login",
                    json={"email": "test@example.com", "password": "password123"},
                )

        with then("the response body includes the user email"):
            assert_that(response.status_code, equal_to(200))
            body = response.json()
            assert_that(body, has_key("email"))
            assert_that(body["email"], equal_to(mock_user.email))


class TestLogout:

    async def test_logout_returns_200(self, client):
        with given("any authenticated session"):
            pass

        with when("the logout endpoint is called"):
            response = await client.post("/auth/logout")

        with then("the server confirms logout with 200"):
            assert_that(response.status_code, equal_to(200))

    async def test_logout_response_contains_message(self, client):
        with given("any state"):
            pass

        with when("logout is requested"):
            response = await client.post("/auth/logout")

        with then("the body contains a confirmation message"):
            body = response.json()
            assert_that(body, has_key("message"))
            assert_that(body["message"], contains_string("out"))


class TestGetMe:

    async def test_get_me_returns_200_with_current_user(self, client, mock_user):
        with given("the client fixture injects mock_user as the current user"):
            pass

        with when("the auth/me endpoint is called"):
            response = await client.get("/auth/me")

        with then("the server returns the authenticated user profile"):
            assert_that(response.status_code, equal_to(200))
            body = response.json()
            assert_that(body["email"], equal_to(mock_user.email))
            assert_that(body["id_user"], equal_to(mock_user.id_user))

    async def test_get_me_includes_name_and_location(self, client, mock_user):
        with given("the current user has name country and city set"):
            pass

        with when("the auth/me endpoint is called"):
            response = await client.get("/auth/me")

        with then("the response includes name country and city"):
            body = response.json()
            assert_that(body["name"], equal_to(mock_user.name))
            assert_that(body["country"], equal_to(mock_user.country))
            assert_that(body["city"], equal_to(mock_user.city))
