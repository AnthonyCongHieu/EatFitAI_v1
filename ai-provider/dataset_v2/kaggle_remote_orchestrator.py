from __future__ import annotations

import argparse
import builtins
import contextlib
import json
import shutil
import time
from pathlib import Path


def get_api():
    from kaggle.api.kaggle_api_extended import KaggleApi

    api = KaggleApi()
    api.authenticate()
    return api


def write_dataset_metadata(folder: Path, title: str, dataset_id: str, license_name: str) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    metadata = {
        "title": title,
        "id": dataset_id,
        "licenses": [{"name": license_name}],
    }
    (folder / "dataset-metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def create_or_version_dataset(folder: Path, message: str) -> None:
    api = get_api()
    metadata_path = folder / "dataset-metadata.json"
    if not metadata_path.exists():
        raise FileNotFoundError(metadata_path)
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    dataset_id = metadata["id"]
    owner, slug = dataset_id.split("/", 1)
    exists = False
    try:
        for item in api.dataset_list(search=slug, user=owner) or []:
            if getattr(item, "ref", "") == dataset_id:
                exists = True
                break
    except Exception:
        exists = False
    if exists:
        print(f"Versioning Kaggle dataset: {dataset_id}")
        api.dataset_create_version(str(folder), version_notes=message, quiet=False, convert_to_csv=False, dir_mode="zip")
    else:
        print(f"Creating Kaggle dataset: {dataset_id}")
        api.dataset_create_new(str(folder), public=False, quiet=False, convert_to_csv=False, dir_mode="zip")


def prepare_kernel_folder(source_dir: Path, out_dir: Path, kernel_metadata: Path, extra_files: list[Path]) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(kernel_metadata, out_dir / "kernel-metadata.json")
    for path in extra_files:
        if path.is_file():
            shutil.copy2(path, out_dir / path.name)
    for script in source_dir.glob("*.py"):
        shutil.copy2(script, out_dir / script.name)
    for seed in source_dir.glob("*.csv"):
        shutil.copy2(seed, out_dir / seed.name)
    for seed in source_dir.glob("*.yaml"):
        shutil.copy2(seed, out_dir / seed.name)


def push_kernel(folder: Path) -> str:
    api = get_api()
    response = api.kernels_push(str(folder))
    print(response)
    metadata = json.loads((folder / "kernel-metadata.json").read_text(encoding="utf-8"))
    return metadata["id"]


def wait_kernel(kernel_id: str, poll_seconds: int, timeout_seconds: int) -> str:
    api = get_api()
    start = time.time()
    last_status = ""
    while True:
        status = api.kernels_status(kernel_id)
        raw_status = getattr(status, "status", status)
        status_name = getattr(raw_status, "name", str(raw_status))
        normalized = status_name.split(".")[-1].lower()
        if status_name != last_status:
            print(f"{kernel_id}: {status_name}")
            last_status = status_name
        if normalized in {"complete", "error", "cancelled"}:
            return status_name
        if time.time() - start > timeout_seconds:
            raise TimeoutError(f"Timed out waiting for {kernel_id}; last status={status_name}")
        time.sleep(poll_seconds)


def download_kernel_output(kernel_id: str, out_dir: Path, api: object | None = None) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    api = api or get_api()
    with default_text_open_utf8():
        files, log = api.kernels_output(kernel_id, str(out_dir), force=True, quiet=True)
    if log:
        print(str(log).encode("utf-8", errors="replace").decode("utf-8", errors="replace"))
    for file in files:
        print(file)


@contextlib.contextmanager
def default_text_open_utf8():
    original_open = builtins.open

    def open_utf8(file, mode="r", *args, **kwargs):
        if "b" not in mode and "encoding" not in kwargs:
            kwargs["encoding"] = "utf-8"
        return original_open(file, mode, *args, **kwargs)

    builtins.open = open_utf8
    try:
        yield
    finally:
        builtins.open = original_open


def main() -> int:
    parser = argparse.ArgumentParser(description="Kaggle remote automation helper for EatFitAI Dataset V2.")
    sub = parser.add_subparsers(dest="cmd", required=True)

    auth = sub.add_parser("auth-check")
    auth.add_argument("--search", default="vietfood68")

    ds = sub.add_parser("dataset")
    ds.add_argument("--folder", type=Path, required=True)
    ds.add_argument("--message", default="EatFitAI Dataset V2 automated version")

    prep = sub.add_parser("prepare-kernel")
    prep.add_argument("--source-dir", type=Path, default=Path("ai-provider/dataset_v2"))
    prep.add_argument("--out-dir", type=Path, default=Path("_dataset_v2_raw_audit_kernel"))
    prep.add_argument("--kernel-metadata", type=Path, default=Path("ai-provider/dataset_v2/kaggle_raw_audit_kernel_metadata.json"))
    prep.add_argument("--extra-files", type=Path, nargs="*", default=[])

    push = sub.add_parser("push-kernel")
    push.add_argument("--folder", type=Path, required=True)

    wait = sub.add_parser("wait-kernel")
    wait.add_argument("--kernel-id", required=True)
    wait.add_argument("--poll-seconds", type=int, default=60)
    wait.add_argument("--timeout-seconds", type=int, default=12 * 60 * 60)

    output = sub.add_parser("output")
    output.add_argument("--kernel-id", required=True)
    output.add_argument("--out-dir", type=Path, required=True)

    args = parser.parse_args()
    if args.cmd == "auth-check":
        api = get_api()
        print("authenticated")
        for item in (api.dataset_list(search=args.search) or [])[:5]:
            print(getattr(item, "ref", ""), "|", getattr(item, "title", ""))
    elif args.cmd == "dataset":
        create_or_version_dataset(args.folder, args.message)
    elif args.cmd == "prepare-kernel":
        prepare_kernel_folder(args.source_dir, args.out_dir, args.kernel_metadata, args.extra_files)
        print(json.dumps({"folder": str(args.out_dir), "prepared": True}, ensure_ascii=False, indent=2))
    elif args.cmd == "push-kernel":
        print(push_kernel(args.folder))
    elif args.cmd == "wait-kernel":
        print(wait_kernel(args.kernel_id, args.poll_seconds, args.timeout_seconds))
    elif args.cmd == "output":
        download_kernel_output(args.kernel_id, args.out_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
