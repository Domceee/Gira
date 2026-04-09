from datetime import timedelta

import pytest
from jose import jwt
from hamcrest import assert_that, equal_to, is_not, instance_of, has_key, greater_than, less_than

from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token
from tests.conftest import given, when, then


class TestHashPassword:

    def test_hash_returns_a_string(self):
        with given("a plain-text password"):
            plain = "supersecret"

        with when("we hash it"):
            result = hash_password(plain)

        with then("the result is a non-empty string"):
            assert_that(result, instance_of(str))
            assert_that(len(result), greater_than(0))

    def test_hash_is_not_equal_to_plain_text(self):
        with given("a plain-text password"):
            plain = "supersecret"

        with when("we hash it"):
            result = hash_password(plain)

        with then("the stored value never equals the original"):
            assert_that(result, is_not(equal_to(plain)))

    def test_same_password_produces_different_hashes(self):
        with given("the same password to be hashed twice"):
            plain = "supersecret"

        with when("we hash it twice"):
            hash_a = hash_password(plain)
            hash_b = hash_password(plain)

        with then("the two hashes differ due to different salts"):
            assert_that(hash_a, is_not(equal_to(hash_b)))


class TestVerifyPassword:

    def test_correct_password_returns_true(self):
        with given("a plain-text password and its hash"):
            plain = "correctpassword"
            hashed = hash_password(plain)

        with when("we verify with the correct password"):
            result = verify_password(plain, hashed)

        with then("verification succeeds"):
            assert_that(result, equal_to(True))

    def test_wrong_password_returns_false(self):
        with given("a hash of the correct password"):
            hashed = hash_password("correctpassword")

        with when("we verify with the wrong password"):
            result = verify_password("wrongpassword", hashed)

        with then("verification fails"):
            assert_that(result, equal_to(False))

    def test_empty_string_does_not_match_non_empty_hash(self):
        with given("a hash of a real password"):
            hashed = hash_password("somepassword")

        with when("we verify with an empty string"):
            result = verify_password("", hashed)

        with then("empty string must not verify against a non-empty hash"):
            assert_that(result, equal_to(False))


class TestCreateAccessToken:

    def test_returns_a_non_empty_string(self):
        with given("a payload with a subject claim"):
            data = {"sub": "42"}

        with when("we create a token"):
            token = create_access_token(data)

        with then("we get a non-empty string"):
            assert_that(token, instance_of(str))
            assert_that(len(token), greater_than(0))

    def test_token_contains_sub_claim(self):
        with given("a subject identifier"):
            user_id = "99"

        with when("we create a token embedding that subject"):
            token = create_access_token({"sub": user_id})

        with then("decoding the token reveals the sub claim"):
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            assert_that(payload, has_key("sub"))
            assert_that(payload["sub"], equal_to(user_id))

    def test_token_contains_exp_claim(self):
        with given("any payload"):
            data = {"sub": "1"}

        with when("we create a token"):
            token = create_access_token(data)

        with then("the decoded payload includes an expiry timestamp"):
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            assert_that(payload, has_key("exp"))

    def test_custom_expiry_is_respected(self):
        with given("two tokens created with different expiry deltas"):
            data = {"sub": "1"}
            short_token = create_access_token(data, expires_delta=timedelta(minutes=1))
            long_token = create_access_token(data, expires_delta=timedelta(hours=24))

        with when("both tokens are decoded"):
            short_payload = jwt.decode(short_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            long_payload = jwt.decode(long_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

        with then("the short-expiry token's exp is earlier than the long-expiry token's exp"):
            assert_that(short_payload["exp"], less_than(long_payload["exp"]))
