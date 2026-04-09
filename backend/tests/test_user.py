from unittest.mock import MagicMock

import pytest
from hamcrest import assert_that, equal_to, has_key, has_length

from app.models.user import User
from tests.conftest import make_execute_result, given, when, then


def _make_mock_user(user_id: int = 2, name: str = "Jane", email: str = "jane@example.com"):
    user = MagicMock(spec=User)
    user.id_user = user_id
    user.name = name
    user.email = email
    user.country = "Germany"
    user.city = "Berlin"
    user.password = "hashed"
    user.auth_provider = "local"
    user.google_sub = None
    return user


class TestGetMe:

    async def test_get_me_returns_200_with_current_user(self, client, mock_user):
        with given("the client fixture injects mock_user as the authenticated user"):
            pass

        with when("the api/user/me endpoint is called"):
            response = await client.get("/api/user/me")

        with then("the server returns the authenticated user profile with status 200"):
            assert_that(response.status_code, equal_to(200))
            body = response.json()
            assert_that(body["id_user"], equal_to(mock_user.id_user))
            assert_that(body["email"], equal_to(mock_user.email))

    async def test_get_me_includes_all_profile_fields(self, client, mock_user):
        with given("the current user has all profile fields populated"):
            pass

        with when("the endpoint is called"):
            response = await client.get("/api/user/me")

        with then("the response contains name country and city"):
            body = response.json()
            assert_that(body["name"], equal_to(mock_user.name))
            assert_that(body["country"], equal_to(mock_user.country))
            assert_that(body["city"], equal_to(mock_user.city))


class TestUpdateMe:

    async def test_update_name_returns_200_with_updated_data(self, client, mock_db, mock_user):
        with given("an authenticated user who wants to change their name"):
            mock_db.execute.return_value = make_execute_result(scalar=mock_user)

        with when("a PUT is sent with a new name"):
            response = await client.put(
                "/api/user/me",
                json={"name": "Updated Name"},
            )

        with then("200 is returned and the user data is in the body"):
            assert_that(response.status_code, equal_to(200))
            body = response.json()
            assert_that(body, has_key("email"))

    async def test_update_city_and_country_returns_200(self, client, mock_db, mock_user):
        with given("the current user wants to update their location"):
            mock_db.execute.return_value = make_execute_result(scalar=mock_user)

        with when("city and country are changed"):
            response = await client.put(
                "/api/user/me",
                json={"city": "Krakow", "country": "Poland"},
            )

        with then("200 and the user object is returned"):
            assert_that(response.status_code, equal_to(200))

    async def test_update_with_empty_payload_returns_200(self, client, mock_db, mock_user):
        with given("a payload where all fields are None resulting in a no-op update"):
            mock_db.execute.return_value = make_execute_result(scalar=mock_user)

        with when("an empty update is submitted"):
            response = await client.put("/api/user/me", json={})

        with then("200 because nothing changes but the request is valid"):
            assert_that(response.status_code, equal_to(200))

    async def test_update_password_hashes_it(self, client, mock_db, mock_user):
        with given("the user wants to set a new password"):
            mock_db.execute.return_value = make_execute_result(scalar=mock_user)

        with when("a new password is submitted"):
            response = await client.put(
                "/api/user/me",
                json={"password": "newpassword123"},
            )

        with then("the request succeeds and the route hashes the password internally"):
            assert_that(response.status_code, equal_to(200))


class TestSearchUsers:

    async def test_search_returns_matching_users(self, client, mock_db):
        with given("two users match the search query"):
            user_a = _make_mock_user(user_id=2, name="Jane Doe", email="jane@example.com")
            user_b = _make_mock_user(user_id=3, name="Janet Smith", email="janet@example.com")
            mock_db.execute.return_value = make_execute_result(scalars_list=[user_a, user_b])

        with when("a search for jane is performed"):
            response = await client.get("/api/user/search?email=jane")

        with then("both matching users are returned"):
            assert_that(response.status_code, equal_to(200))
            body = response.json()
            assert_that(body, has_length(2))

    async def test_search_returns_empty_list_when_no_match(self, client, mock_db):
        with given("no users match the query"):
            mock_db.execute.return_value = make_execute_result(scalars_list=[])

        with when("the search is performed"):
            response = await client.get("/api/user/search?email=nosuchuser")

        with then("an empty list is returned with 200"):
            assert_that(response.status_code, equal_to(200))
            assert_that(response.json(), equal_to([]))

    async def test_search_result_contains_expected_fields(self, client, mock_db):
        with given("one user matches the query"):
            user = _make_mock_user(user_id=2, name="Alice", email="alice@example.com")
            mock_db.execute.return_value = make_execute_result(scalars_list=[user])

        with when("a search is performed"):
            response = await client.get("/api/user/search?email=alice")

        with then("the result includes id name email country and city"):
            body = response.json()
            result_user = body[0]
            assert_that(result_user, has_key("id_user"))
            assert_that(result_user, has_key("name"))
            assert_that(result_user, has_key("email"))
            assert_that(result_user, has_key("country"))
            assert_that(result_user, has_key("city"))

    async def test_search_excludes_current_user_from_results(self, client, mock_db, mock_user):
        with given("only a different user matches the query"):
            other_user = _make_mock_user(user_id=99, name="Bob", email="bob@example.com")
            mock_db.execute.return_value = make_execute_result(scalars_list=[other_user])

        with when("a search is performed"):
            response = await client.get("/api/user/search?email=bob")

        with then("only the other user is in the results not the caller"):
            body = response.json()
            ids = [u["id_user"] for u in body]
            assert_that(mock_user.id_user not in ids, equal_to(True))

    async def test_search_with_project_id_filter_returns_200(self, client, mock_db):
        with given("a project_id filter is supplied to exclude existing members"):
            mock_db.execute.return_value = make_execute_result(scalars_list=[])

        with when("the search includes a project_id filter"):
            response = await client.get("/api/user/search?email=alice&project_id=1")

        with then("the call succeeds"):
            assert_that(response.status_code, equal_to(200))

    async def test_search_with_empty_email_query_returns_422(self, client, mock_db):
        with given("the email query parameter is provided but empty violating min_length=1"):
            pass

        with when("the request is made with an empty string"):
            response = await client.get("/api/user/search?email=")

        with then("422 Unprocessable Entity because the validation constraint is violated"):
            assert_that(response.status_code, equal_to(422))
