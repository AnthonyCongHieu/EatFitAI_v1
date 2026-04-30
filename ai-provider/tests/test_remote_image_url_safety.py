import unittest
from unittest.mock import patch

try:
    import app as app_module
except ModuleNotFoundError as exc:
    app_module = None
    import_error = exc


class RemoteImageUrlSafetyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if app_module is None:
            raise unittest.SkipTest(f"AI provider app dependencies unavailable: {import_error.name}")

    def setUp(self):
        self.client = app_module.app.test_client()

    def test_detect_rejects_private_image_url_without_fetching(self):
        with (
            patch.object(app_module, "_is_internal_request_authorized", return_value=True),
            patch("requests.get", side_effect=AssertionError("private URL must not be fetched")),
        ):
            response = self.client.post(
                "/detect",
                json={"image_url": "http://127.0.0.1/latest/meta-data"},
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "invalid image_url")

    def test_detect_stops_remote_download_when_stream_exceeds_limit(self):
        oversized_response = _FakeStreamingResponse(
            headers={"Content-Type": "image/jpeg"},
            chunks=[b"x" * (app_module.MAX_FILE_SIZE + 1)],
        )

        with (
            patch.dict("os.environ", {"AI_PROVIDER_ALLOWED_MEDIA_HOSTS": "media.example.test"}),
            patch.object(app_module, "_is_internal_request_authorized", return_value=True),
            patch.object(app_module, "_host_resolves_to_private", return_value=False),
            patch("requests.get", return_value=oversized_response),
        ):
            response = self.client.post(
                "/detect",
                json={"image_url": "https://media.example.test/vision/user/photo.jpg"},
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "file too large")

    def test_voice_transcribe_rejects_private_audio_url_without_fetching(self):
        with (
            patch.object(app_module, "_is_internal_request_authorized", return_value=True),
            patch.object(app_module, "is_stt_available", return_value=True),
            patch("requests.get", side_effect=AssertionError("private audio URL must not be fetched")),
        ):
            response = self.client.post(
                "/voice/transcribe",
                json={"audio_url": "http://127.0.0.1/latest/meta-data"},
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "invalid audio_url")

    def test_voice_transcribe_rejects_redirecting_audio_url(self):
        redirect_response = _FakeStreamingResponse(
            headers={"Content-Type": "audio/mp4"},
            chunks=[],
            status_code=302,
        )

        with (
            patch.dict("os.environ", {"AI_PROVIDER_ALLOWED_MEDIA_HOSTS": "media.example.test"}),
            patch.object(app_module, "_is_internal_request_authorized", return_value=True),
            patch.object(app_module, "is_stt_available", return_value=True),
            patch.object(app_module, "_host_resolves_to_private", return_value=False),
            patch("requests.get", return_value=redirect_response),
        ):
            response = self.client.post(
                "/voice/transcribe",
                json={"audio_url": "https://media.example.test/voice/user/audio.m4a"},
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "redirect not allowed")

    def test_voice_transcribe_stops_download_without_content_length_when_stream_exceeds_limit(self):
        oversized_response = _FakeStreamingResponse(
            headers={"Content-Type": "audio/mp4"},
            chunks=[b"x" * (app_module.MAX_FILE_SIZE + 1)],
        )

        with (
            patch.dict("os.environ", {"AI_PROVIDER_ALLOWED_MEDIA_HOSTS": "media.example.test"}),
            patch.object(app_module, "_is_internal_request_authorized", return_value=True),
            patch.object(app_module, "is_stt_available", return_value=True),
            patch.object(app_module, "_host_resolves_to_private", return_value=False),
            patch("requests.get", return_value=oversized_response),
            patch.object(app_module, "gemini_transcribe_audio", return_value="must not be called"),
        ):
            response = self.client.post(
                "/voice/transcribe",
                json={"audio_url": "https://media.example.test/voice/user/audio.m4a"},
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "file too large")

    def test_voice_transcribe_accepts_allowed_audio_host(self):
        audio_response = _FakeStreamingResponse(
            headers={"Content-Type": "audio/mp4", "Content-Length": "4"},
            chunks=[b"test"],
        )

        with (
            patch.dict("os.environ", {"AI_PROVIDER_ALLOWED_MEDIA_HOSTS": "media.example.test"}),
            patch.object(app_module, "_is_internal_request_authorized", return_value=True),
            patch.object(app_module, "is_stt_available", return_value=True),
            patch.object(app_module, "_host_resolves_to_private", return_value=False),
            patch("requests.get", return_value=audio_response) as get_mock,
            patch.object(app_module, "gemini_transcribe_audio", return_value="xin chao"),
        ):
            response = self.client.post(
                "/voice/transcribe",
                json={"audio_url": "https://media.example.test/voice/user/audio.m4a"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["success"])
        self.assertEqual(response.get_json()["text"], "xin chao")
        self.assertFalse(get_mock.call_args.kwargs["allow_redirects"])


class _FakeStreamingResponse:
    def __init__(self, headers, chunks, status_code=200):
        self.headers = headers
        self._chunks = chunks
        self.status_code = status_code

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def raise_for_status(self):
        return None

    def iter_content(self, chunk_size=8192):
        yield from self._chunks


if __name__ == "__main__":
    unittest.main()
