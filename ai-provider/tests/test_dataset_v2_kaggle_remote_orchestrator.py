import io
import sys
import tempfile
import unittest
from pathlib import Path


DATASET_V2_DIR = Path(__file__).resolve().parents[1] / "dataset_v2"
if str(DATASET_V2_DIR) not in sys.path:
    sys.path.insert(0, str(DATASET_V2_DIR))

from kaggle_remote_orchestrator import download_kernel_output  # noqa: E402


class FakeKaggleApi:
    def __init__(self):
        self.calls = []

    def kernels_output(self, kernel_id, out_dir, force=True, quiet=False):
        self.calls.append({"kernel_id": kernel_id, "out_dir": out_dir, "force": force, "quiet": quiet})
        return ["report.json"], "Downloaded báo cáo gia vị"


class LogWritingKaggleApi:
    def kernels_output(self, kernel_id, out_dir, force=True, quiet=False):
        log_path = Path(out_dir) / "owner-kernel.log"
        with open(log_path, "w") as f:
            f.write("gia vị")
        return [str(log_path)], ""


class KaggleRemoteOrchestratorTests(unittest.TestCase):
    def test_download_kernel_output_uses_quiet_api_and_prints_unicode_safely(self):
        api = FakeKaggleApi()
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            with tempfile.TemporaryDirectory() as tmp:
                download_kernel_output("owner/kernel", Path(tmp), api=api)
                output = sys.stdout.getvalue()
        finally:
            sys.stdout = old_stdout

        self.assertEqual(api.calls[0]["quiet"], True)
        self.assertIn("báo cáo gia vị", output)
        self.assertIn("report.json", output)

    def test_download_kernel_output_handles_unicode_log_written_by_kaggle_api(self):
        api = LogWritingKaggleApi()
        with tempfile.TemporaryDirectory() as tmp:
            download_kernel_output("owner/kernel", Path(tmp), api=api)
            log_text = (Path(tmp) / "owner-kernel.log").read_text(encoding="utf-8")

        self.assertEqual(log_text, "gia vị")


if __name__ == "__main__":
    unittest.main()
