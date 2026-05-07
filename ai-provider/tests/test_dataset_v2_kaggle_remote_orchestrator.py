import io
import sys
import tempfile
import unittest
from pathlib import Path


DATASET_V2_DIR = Path(__file__).resolve().parents[1] / "dataset_v2"
if str(DATASET_V2_DIR) not in sys.path:
    sys.path.insert(0, str(DATASET_V2_DIR))

import kaggle_remote_orchestrator  # noqa: E402
from kaggle_remote_orchestrator import download_kernel_output, push_kernel  # noqa: E402


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


class FakePushKaggleApi:
    def __init__(self):
        self.calls = []

    def kernels_push(self, folder, timeout=None, acc=None):
        self.calls.append({"folder": folder, "timeout": timeout, "acc": acc})
        return {"error": None}


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


    def test_push_kernel_can_request_specific_accelerator(self):
        api = FakePushKaggleApi()
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            (folder / "kernel-metadata.json").write_text('{"id": "owner/kernel"}\n', encoding="utf-8")
            with unittest.mock.patch.object(kaggle_remote_orchestrator, "get_api", return_value=api):
                self.assertEqual(push_kernel(folder, accelerator="NvidiaTeslaT4Highmem"), "owner/kernel")

        self.assertEqual(api.calls[0]["acc"], "NvidiaTeslaT4Highmem")


if __name__ == "__main__":
    unittest.main()
