import csv
import json
import sys
import tempfile
import unittest
from pathlib import Path


DATASET_V2_DIR = Path(__file__).resolve().parents[1] / "dataset_v2"
if str(DATASET_V2_DIR) not in sys.path:
    sys.path.insert(0, str(DATASET_V2_DIR))

from prepare_kaggle_packages import (  # noqa: E402
    prepare_pipeline_code_package,
    prepare_raw_sources_package,
)


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    fieldnames: list[str] = []
    for row in rows:
        for key in row:
            if key not in fieldnames:
                fieldnames.append(key)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


class KagglePackagePrepTests(unittest.TestCase):
    def test_raw_package_copies_manifest_zips_and_records_missing_or_skipped_sources(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            raw_dir = root / "drive_raw"
            raw_dir.mkdir()
            (raw_dir / "keep.zip").write_bytes(b"zip-bytes")
            (raw_dir / "quarantine.zip").write_bytes(b"bad-source")
            manifest = root / "source_manifest.csv"
            write_csv(
                manifest,
                [
                    {
                        "source_slug": "keep_source",
                        "drive_zip_name": "keep.zip",
                        "initial_decision": "PENDING_AUDIT",
                    },
                    {
                        "source_slug": "missing_source",
                        "drive_zip_name": "missing.zip",
                        "initial_decision": "PENDING_AUDIT",
                    },
                    {
                        "source_slug": "quarantined_source",
                        "drive_zip_name": "quarantine.zip",
                        "initial_decision": "QUARANTINE",
                    },
                ],
            )

            summary = prepare_raw_sources_package(
                raw_dir=raw_dir,
                manifest_path=manifest,
                out_dir=root / "kaggle_raw",
                kaggle_id="owner/raw-sources",
                title="Raw Sources",
                license_name="CC-BY-4.0",
                include_quarantine=False,
                fail_on_missing=False,
            )

            out_dir = root / "kaggle_raw"
            metadata = json.loads((out_dir / "dataset-metadata.json").read_text(encoding="utf-8"))
            manifest_rows = read_csv(out_dir / "raw_source_manifest.csv")

            self.assertEqual(metadata["id"], "owner/raw-sources")
            self.assertTrue((out_dir / "keep.zip").exists())
            self.assertFalse((out_dir / "quarantine.zip").exists())
            self.assertEqual(summary["copied"], 1)
            self.assertEqual(summary["missing"], 1)
            self.assertEqual(summary["skipped"], 1)
            self.assertEqual([row["status"] for row in manifest_rows], ["copied", "missing_local_zip", "skipped_quarantine"])
            self.assertEqual(manifest_rows[0]["size_bytes"], str(len(b"zip-bytes")))
            self.assertTrue(manifest_rows[0]["sha256"])

    def test_pipeline_code_package_copies_only_reproducible_pipeline_inputs(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_dir = root / "dataset_v2"
            source_dir.mkdir()
            (source_dir / "audit_sources.py").write_text("print('audit')\n", encoding="utf-8")
            (source_dir / "common.py").write_text("VALUE = 1\n", encoding="utf-8")
            (source_dir / "source_manifest.seed.csv").write_text("source_slug\nx\n", encoding="utf-8")
            (source_dir / "class_taxonomy.seed.yaml").write_text("classes: []\n", encoding="utf-8")
            (source_dir / "generated.zip").write_bytes(b"do-not-copy")
            (source_dir / "__pycache__").mkdir()
            (source_dir / "__pycache__" / "common.pyc").write_bytes(b"cache")

            summary = prepare_pipeline_code_package(
                source_dir=source_dir,
                out_dir=root / "pipeline_code",
                kaggle_id="owner/pipeline-code",
                title="Pipeline Code",
                license_name="Apache-2.0",
            )

            out_dir = root / "pipeline_code"
            metadata = json.loads((out_dir / "dataset-metadata.json").read_text(encoding="utf-8"))

            self.assertEqual(metadata["id"], "owner/pipeline-code")
            self.assertTrue((out_dir / "audit_sources.py").exists())
            self.assertTrue((out_dir / "common.py").exists())
            self.assertTrue((out_dir / "source_manifest.seed.csv").exists())
            self.assertTrue((out_dir / "class_taxonomy.seed.yaml").exists())
            self.assertFalse((out_dir / "generated.zip").exists())
            self.assertFalse((out_dir / "__pycache__").exists())
            self.assertGreaterEqual(summary["files_copied"], 4)

    def test_pipeline_code_package_can_include_public_drive_retry_scope(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_dir = root / "dataset_v2"
            source_dir.mkdir()
            (source_dir / "audit_sources.py").write_text("print('audit')\n", encoding="utf-8")
            scope = root / "retry_scope.csv"
            scope.write_text("source_slug\nretry_one\n", encoding="utf-8")

            prepare_pipeline_code_package(
                source_dir=source_dir,
                out_dir=root / "pipeline_code",
                kaggle_id="owner/pipeline-code",
                title="Pipeline Code",
                license_name="Apache-2.0",
                public_drive_scope_path=scope,
            )

            self.assertEqual(
                (root / "pipeline_code" / "public_drive_source_scope.csv").read_text(encoding="utf-8"),
                "source_slug\nretry_one\n",
            )

    def test_pipeline_code_package_removes_stale_managed_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_dir = root / "dataset_v2"
            source_dir.mkdir()
            (source_dir / "audit_sources.py").write_text("print('audit')\n", encoding="utf-8")
            out_dir = root / "pipeline_code"
            out_dir.mkdir()
            (out_dir / "stale_scope.csv").write_text("source_slug\nold\n", encoding="utf-8")
            (out_dir / "keep.bin").write_bytes(b"not-managed")

            prepare_pipeline_code_package(
                source_dir=source_dir,
                out_dir=out_dir,
                kaggle_id="owner/pipeline-code",
                title="Pipeline Code",
                license_name="Apache-2.0",
            )

            self.assertFalse((out_dir / "stale_scope.csv").exists())
            self.assertTrue((out_dir / "keep.bin").exists())


if __name__ == "__main__":
    unittest.main()
