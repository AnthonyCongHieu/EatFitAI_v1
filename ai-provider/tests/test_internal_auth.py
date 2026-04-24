import unittest

from internal_auth import (
    allows_insecure_dev_internal_requests,
    internal_auth_missing,
    is_internal_request_authorized,
)


class InternalAuthTests(unittest.TestCase):
    def test_rejects_when_token_missing_by_default(self):
        env = {}

        self.assertTrue(internal_auth_missing(env))
        self.assertFalse(is_internal_request_authorized(None, env))

    def test_allows_explicit_insecure_dev_escape_hatch(self):
        env = {"ALLOW_INSECURE_AI_PROVIDER_DEV": "true"}

        self.assertTrue(allows_insecure_dev_internal_requests(env))
        self.assertFalse(internal_auth_missing(env))
        self.assertTrue(is_internal_request_authorized(None, env))

    def test_dev_escape_hatch_is_ignored_in_production(self):
        env = {
            "ALLOW_INSECURE_AI_PROVIDER_DEV": "true",
            "APP_ENV": "production",
        }

        self.assertTrue(internal_auth_missing(env))
        self.assertFalse(is_internal_request_authorized(None, env))

    def test_dev_escape_hatch_is_ignored_on_render(self):
        env = {
            "ALLOW_INSECURE_AI_PROVIDER_DEV": "true",
            "RENDER": "true",
        }

        self.assertTrue(internal_auth_missing(env))
        self.assertFalse(is_internal_request_authorized(None, env))

    def test_requires_matching_token_when_configured(self):
        env = {"AI_PROVIDER_INTERNAL_TOKEN": "expected-token"}

        self.assertFalse(is_internal_request_authorized(None, env))
        self.assertFalse(is_internal_request_authorized("wrong-token", env))
        self.assertTrue(is_internal_request_authorized("expected-token", env))


if __name__ == "__main__":
    unittest.main()
