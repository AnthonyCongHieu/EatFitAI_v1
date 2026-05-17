#!/usr/bin/env python3
"""Sync Google Drive food catalog images to Cloudflare R2.

Default mode is dry-run. Use --apply only after reviewing the JSON report.
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import re
import sys
import unicodedata
import urllib.error
import urllib.request
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.parse import quote


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_FOLDER_ID = "1wyHHBkhVlztP-OzzEzqtR5RfOPB8lsA7"
DEFAULT_DOWNLOAD_DIR = REPO_ROOT / "_tmp" / "drive_food_new_raw"
DEFAULT_REPORT = REPO_ROOT / "_tmp" / "food_catalog_image_sync_report.json"
SEED_JSON_PATH = REPO_ROOT / "eatfitai-backend" / "Data" / "SeedData" / "ai_vision_food_catalog.v1.json"
CATALOG_CS_PATH = REPO_ROOT / "eatfitai-backend" / "Data" / "AiVisionLabelCatalog.cs"
FOOD_BUCKET = "food-images"
R2_BUCKET_DEFAULT = "eatfitai-media"
THUMB_MAX_WIDTH = 320
MEDIUM_MAX_WIDTH = 1080
THUMB_MAX_BYTES = 100 * 1024
MEDIUM_MAX_BYTES = 350 * 1024
MAX_SOURCE_BYTES = 8 * 1024 * 1024
CACHE_CONTROL_IMMUTABLE = "public, max-age=31536000, immutable"
HTTP_TIMEOUT = 60


MANUAL_FILENAME_LABELS = {
    "bo ne": "sizzling_beef_steak",
    "bun bo": "bun_bo_hue",
    "cai bo xoi": "spinach",
    "cai thia": "bokchoy",
    "hu tiu": "hu_tieu",
    "mi": "noodles",
    "pho bo": "pho",
    "thi bo": "beef",
    "thit ba roi": "pork_belly",
    "thit ca": "fish",
    "thit hap khoai mon": "steamed_pork_belly_taro",
    "thit heo ba chi nuong": "grilled_pork_belly",
    "xoi man": "xoi",
}


@dataclass(frozen=True)
class CatalogEntry:
    label: str
    display_name_vi: str
    aliases: list[str]


@dataclass(frozen=True)
class DriveImage:
    file_id: str
    name: str
    mime_type: str


@dataclass(frozen=True)
class VariantKeys:
    thumb_key: str
    medium_key: str

    def thumb_url(self, public_base_url: str) -> str:
        return build_public_url(public_base_url, self.thumb_key)

    def medium_url(self, public_base_url: str) -> str:
        return build_public_url(public_base_url, self.medium_key)


@dataclass(frozen=True)
class SyncItem:
    label: str
    source_name: str
    source_file_id: str
    source_path: str
    thumb_key: str
    medium_key: str
    thumb_url: str
    medium_url: str
    match_reason: str


@dataclass(frozen=True)
class SyncPlan:
    items: list[SyncItem]
    missing_labels: list[str]
    duplicate_labels: dict[str, list[str]]
    unmatched_files: list[str]
    summary: dict[str, int]

    @property
    def by_label(self) -> dict[str, SyncItem]:
        return {item.label: item for item in self.items}


@dataclass(frozen=True)
class R2Settings:
    account_id: str
    bucket: str
    access_key_id: str
    secret_access_key: str
    public_base_url: str


@dataclass(frozen=True)
class DbSettings:
    host: str
    port: int
    database: str
    user: str
    password: str
    sslmode: str
    connect_timeout: int


def normalize_key(value: str | None) -> str:
    if not value:
        return ""

    raw = Path(value).stem if Path(value).suffix else value
    lower = raw.strip().lower().normalize("NFC") if hasattr(str, "normalize") else raw.strip().lower()
    decomposed = unicodedata.normalize("NFD", lower)
    result: list[str] = []
    last_was_space = True
    for char in decomposed:
        if unicodedata.category(char) == "Mn":
            continue
        normalized = "d" if char == "đ" else char
        if normalized.isalnum():
            result.append(normalized)
            last_was_space = False
        elif not last_was_space:
            result.append(" ")
            last_was_space = True
    return unicodedata.normalize("NFC", "".join(result).strip())


def build_variant_keys(label: str) -> VariantKeys:
    safe_label = normalize_label(label)
    return VariantKeys(
        thumb_key=f"{FOOD_BUCKET}/v2/thumb/{safe_label}.webp",
        medium_key=f"{FOOD_BUCKET}/v2/medium/{safe_label}.webp",
    )


def normalize_label(label: str) -> str:
    value = label.strip().lower()
    if not re.fullmatch(r"[a-z0-9_]+", value):
        raise ValueError(f"Unsafe label for object key: {label}")
    return value


def build_public_url(public_base_url: str, object_key: str) -> str:
    return f"{public_base_url.rstrip('/')}/{quote(object_key.lstrip('/'), safe='/-_.~')}"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def load_catalog_entries(seed_json_path: Path = SEED_JSON_PATH, catalog_cs_path: Path = CATALOG_CS_PATH) -> list[CatalogEntry]:
    seeds = json.loads(seed_json_path.read_text(encoding="utf-8"))
    aliases_by_label = parse_csharp_aliases(catalog_cs_path.read_text(encoding="utf-8"))

    entries: list[CatalogEntry] = []
    for seed in seeds:
        label = str(seed["label"])
        display_name = str(seed.get("foodName") or "")
        aliases = [
            label.replace("_", " "),
            display_name,
            str(seed.get("foodNameEn") or ""),
            *aliases_by_label.get(label, []),
        ]
        entries.append(
            CatalogEntry(
                label=label,
                display_name_vi=display_name,
                aliases=[alias for alias in aliases if alias and alias.strip()],
            )
        )
    return entries


def parse_csharp_aliases(content: str) -> dict[str, list[str]]:
    result: dict[str, list[str]] = {}
    pattern = re.compile(r'E\("([^"]+)",\s*"([^"]+)",\s*\[(.*?)\]', re.S)
    for label, display_name, alias_blob in pattern.findall(content):
        aliases = [display_name, *re.findall(r'"([^"]*)"', alias_blob)]
        result[label] = aliases
    return result


def list_drive_images(folder_id: str, output_dir: Path) -> list[DriveImage]:
    try:
        import gdown
    except ImportError as exc:
        raise SystemExit("Missing dependency: gdown. Install with `python -m pip install gdown`.") from exc

    files = gdown.download_folder(
        id=folder_id,
        output=str(output_dir),
        quiet=True,
        skip_download=True,
    )
    images: list[DriveImage] = []
    for file in files:
        name = str(file.path)
        suffix = Path(name).suffix.lower()
        if suffix in {".png", ".jpg", ".jpeg", ".webp"}:
            mime_type = {
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".webp": "image/webp",
            }[suffix]
            images.append(DriveImage(file_id=str(file.id), name=name, mime_type=mime_type))
    return images


def download_drive_images(images: list[DriveImage], output_dir: Path, resume: bool = True) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for image in images:
        target = output_dir / image.name
        if resume and target.exists() and target.stat().st_size > 0:
            continue
        url = f"https://drive.google.com/uc?export=download&id={image.file_id}"
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT) as response:
                payload = response.read(MAX_SOURCE_BYTES + 1)
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Failed to download Drive file {image.name} ({image.file_id}): {exc}") from exc
        if len(payload) > MAX_SOURCE_BYTES:
            raise RuntimeError(f"Drive image too large: {image.name} bytes={len(payload)}")
        target.write_bytes(payload)


def build_sync_plan(
    catalog_entries: list[CatalogEntry],
    drive_images: list[DriveImage],
    public_base_url: str,
) -> SyncPlan:
    aliases_by_label = {
        entry.label: {normalize_key(alias) for alias in entry.aliases if normalize_key(alias)}
        for entry in catalog_entries
    }
    catalog_labels = {entry.label for entry in catalog_entries}
    selected: dict[str, SyncItem] = {}
    duplicate_labels: dict[str, list[str]] = {}
    unmatched_files: list[str] = []

    for image in drive_images:
        file_key = normalize_key(image.name)
        label, reason = match_label(file_key, aliases_by_label)
        if label is None or label not in catalog_labels:
            unmatched_files.append(image.name)
            continue

        keys = build_variant_keys(label)
        item = SyncItem(
            label=label,
            source_name=image.name,
            source_file_id=image.file_id,
            source_path=str(image.name),
            thumb_key=keys.thumb_key,
            medium_key=keys.medium_key,
            thumb_url=keys.thumb_url(public_base_url),
            medium_url=keys.medium_url(public_base_url),
            match_reason=reason,
        )
        if label in selected:
            duplicate_labels.setdefault(label, [selected[label].source_name]).append(image.name)
            if reason.startswith("manual"):
                selected[label] = item
        else:
            selected[label] = item

    missing_labels = [entry.label for entry in catalog_entries if entry.label not in selected]
    items = [selected[entry.label] for entry in catalog_entries if entry.label in selected]
    summary = {
        "catalogCount": len(catalog_entries),
        "driveImageCount": len(drive_images),
        "mappedCount": len(items),
        "missingCount": len(missing_labels),
        "duplicateLabelCount": len(duplicate_labels),
        "unmatchedFileCount": len(unmatched_files),
    }
    return SyncPlan(
        items=items,
        missing_labels=missing_labels,
        duplicate_labels=duplicate_labels,
        unmatched_files=unmatched_files,
        summary=summary,
    )


def match_label(file_key: str, aliases_by_label: dict[str, set[str]]) -> tuple[str | None, str]:
    if file_key in MANUAL_FILENAME_LABELS:
        return MANUAL_FILENAME_LABELS[file_key], f"manual:{file_key}"

    best_label: str | None = None
    best_score = 0
    best_alias = ""
    for label, aliases in aliases_by_label.items():
        for alias in aliases:
            score = alias_score(file_key, alias)
            if score > best_score:
                best_label = label
                best_score = score
                best_alias = alias

    if best_label is None or best_score < 900:
        return None, "unmatched"
    return best_label, f"alias:{best_alias}:score:{best_score}"


def alias_score(file_key: str, alias: str) -> int:
    if file_key == alias:
        return 5000
    if file_key.startswith(alias + " ") or alias.startswith(file_key + " "):
        return 4000 - min(len(file_key), len(alias))
    padded_file = f" {file_key} "
    padded_alias = f" {alias} "
    if padded_file in padded_alias or padded_alias in padded_file:
        return 3000 - min(len(file_key), len(alias))
    return 0


def create_webp_variants(source_path: Path) -> tuple[bytes, bytes]:
    try:
        from PIL import Image
    except ImportError as exc:
        raise SystemExit("Missing dependency: Pillow. Install with `python -m pip install Pillow`.") from exc

    source_bytes = source_path.read_bytes()
    if len(source_bytes) > MAX_SOURCE_BYTES:
        raise RuntimeError(f"Source image too large: {source_path} bytes={len(source_bytes)}")

    def encode(max_width: int, max_bytes: int) -> bytes:
        with Image.open(BytesIO(source_bytes)) as image:
            image.load()
            image = image.convert("RGB")
            if image.width > max_width:
                next_height = max(1, int(image.height * (max_width / float(image.width))))
                image = image.resize((max_width, next_height), Image.Resampling.LANCZOS)

            for quality in (75, 68, 60, 52, 45):
                output = BytesIO()
                image.save(output, format="WEBP", quality=quality, method=6)
                payload = output.getvalue()
                if len(payload) <= max_bytes or quality == 45:
                    return payload
        raise RuntimeError(f"Unable to encode {source_path}")

    return encode(THUMB_MAX_WIDTH, THUMB_MAX_BYTES), encode(MEDIUM_MAX_WIDTH, MEDIUM_MAX_BYTES)


def read_r2_settings(env: dict[str, str] | None = None, apply: bool = False, args: argparse.Namespace | None = None) -> R2Settings | None:
    env = env or os.environ
    settings = R2Settings(
        account_id=trim(getattr(args, "r2_account_id", None) if args else None) or trim(env.get("R2_ACCOUNT_ID")),
        bucket=trim(getattr(args, "r2_bucket", None) if args else None) or trim(env.get("R2_BUCKET")) or R2_BUCKET_DEFAULT,
        access_key_id=trim(getattr(args, "r2_access_key_id", None) if args else None) or trim(env.get("R2_ACCESS_KEY_ID")),
        secret_access_key=trim(getattr(args, "r2_secret_access_key", None) if args else None) or trim(env.get("R2_SECRET_ACCESS_KEY")),
        public_base_url=trim(getattr(args, "r2_public_base_url", None) if args else None)
        or trim(env.get("R2_PUBLIC_BASE_URL"))
        or trim(env.get("MEDIA_PUBLIC_BASE_URL")),
    )
    missing = [
        name
        for name, value in (
            ("R2_ACCOUNT_ID", settings.account_id),
            ("R2_ACCESS_KEY_ID", settings.access_key_id),
            ("R2_SECRET_ACCESS_KEY", settings.secret_access_key),
            ("R2_PUBLIC_BASE_URL", settings.public_base_url),
        )
        if not value
    ]
    if missing and apply:
        raise SystemExit(f"Missing R2 setting(s): {', '.join(missing)}")
    return None if missing else settings


def read_db_settings(env: dict[str, str] | None = None, args: argparse.Namespace | None = None) -> DbSettings | None:
    env = env or os.environ
    password = trim(getattr(args, "db_password", None) if args else None) or trim(env.get("SUPABASE_DB_PASSWORD")) or trim(env.get("PGPASSWORD"))
    if not password:
        return None
    current_project_ref = trim(getattr(args, "current_project_ref", None) if args else None) or "bjlmndmafrajjysenpbm"
    return DbSettings(
        host=trim(getattr(args, "db_host", None) if args else None) or trim(env.get("SUPABASE_DB_HOST")) or "aws-1-ap-southeast-1.pooler.supabase.com",
        port=int(trim(getattr(args, "db_port", None) if args else None) or trim(env.get("SUPABASE_DB_PORT")) or "5432"),
        database=trim(getattr(args, "db_name", None) if args else None) or trim(env.get("SUPABASE_DB_NAME")) or "postgres",
        user=trim(getattr(args, "db_user", None) if args else None) or trim(env.get("SUPABASE_DB_USER")) or f"postgres.{current_project_ref}",
        password=password,
        sslmode=trim(getattr(args, "sslmode", None) if args else None) or trim(env.get("SUPABASE_DB_SSLMODE")) or "require",
        connect_timeout=int(trim(getattr(args, "connect_timeout", None) if args else None) or trim(env.get("SUPABASE_DB_CONNECT_TIMEOUT")) or "15"),
    )


def trim(value: Any) -> str:
    return str(value or "").strip()


def upload_r2_object(settings: R2Settings, key: str, payload: bytes) -> None:
    url, headers = build_r2_put_request(settings, key, payload)
    request = urllib.request.Request(url, data=payload, headers=headers, method="PUT")
    try:
        with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT) as response:
            response.read()
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"R2 upload failed for {key}: HTTP {exc.code} {details}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"R2 upload failed for {key}: {exc}") from exc


def build_r2_put_request(settings: R2Settings, key: str, payload: bytes) -> tuple[str, dict[str, str]]:
    now = datetime.now(timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = now.strftime("%Y%m%d")
    payload_hash = hashlib.sha256(payload).hexdigest()
    host = f"{settings.account_id}.r2.cloudflarestorage.com"
    canonical_uri = f"/{settings.bucket.strip('/')}/{quote(key.lstrip('/'), safe='/-_.~')}"
    canonical_headers = {
        "cache-control": CACHE_CONTROL_IMMUTABLE,
        "content-type": "image/webp",
        "host": host,
        "x-amz-content-sha256": payload_hash,
        "x-amz-date": amz_date,
    }
    signed_headers = ";".join(sorted(canonical_headers))
    canonical_headers_blob = "".join(f"{name}:{canonical_headers[name]}\n" for name in sorted(canonical_headers))
    canonical_request = "\n".join(["PUT", canonical_uri, "", canonical_headers_blob, signed_headers, payload_hash])
    credential_scope = f"{date_stamp}/auto/s3/aws4_request"
    string_to_sign = "\n".join(
        [
            "AWS4-HMAC-SHA256",
            amz_date,
            credential_scope,
            hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
        ]
    )

    def sign(key_bytes: bytes, value: str) -> bytes:
        return hmac.new(key_bytes, value.encode("utf-8"), hashlib.sha256).digest()

    signing_key = sign(
        sign(sign(sign(("AWS4" + settings.secret_access_key).encode("utf-8"), date_stamp), "auto"), "s3"),
        "aws4_request",
    )
    signature = hmac.new(signing_key, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
    authorization = (
        "AWS4-HMAC-SHA256 "
        f"Credential={settings.access_key_id}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, "
        f"Signature={signature}"
    )
    return (
        f"https://{host}{canonical_uri}",
        {
            "Authorization": authorization,
            "Cache-Control": CACHE_CONTROL_IMMUTABLE,
            "Content-Type": "image/webp",
            "x-amz-content-sha256": payload_hash,
            "x-amz-date": amz_date,
        },
    )


def update_database(db_settings: DbSettings, items: list[SyncItem]) -> int:
    try:
        import psycopg
    except ImportError as exc:
        raise SystemExit("Missing dependency: psycopg. Install with `python -m pip install psycopg[binary]`.") from exc

    with psycopg.connect(
        host=db_settings.host,
        port=db_settings.port,
        dbname=db_settings.database,
        user=db_settings.user,
        password=db_settings.password,
        sslmode=db_settings.sslmode,
        connect_timeout=db_settings.connect_timeout,
    ) as conn:
        with conn.cursor() as cursor:
            updated = 0
            for item in items:
                cursor.execute(
                    """
                    update public."FoodItem" food
                    set "ThumbNail" = %(thumb_url)s,
                        "UpdatedAt" = now()
                    from public."AiLabelMap" map
                    where map."Label" = %(label)s
                      and map."FoodItemId" = food."FoodItemId"
                    """,
                    {"label": item.label, "thumb_url": item.thumb_url},
                )
                updated += cursor.rowcount
        conn.commit()
    return updated


def write_report(path: Path, report: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


def run(args: argparse.Namespace) -> int:
    download_dir = Path(args.download_dir)
    report_path = Path(args.output)
    catalog = load_catalog_entries()
    drive_images = list_drive_images(args.folder_id, download_dir)
    public_base_url = args.r2_public_base_url or os.environ.get("R2_PUBLIC_BASE_URL") or os.environ.get("MEDIA_PUBLIC_BASE_URL") or "https://<R2_PUBLIC_BASE_URL>"
    plan = build_sync_plan(catalog, drive_images, public_base_url=public_base_url)

    if args.require_complete and (plan.missing_labels or plan.unmatched_files or plan.duplicate_labels):
        report = build_report(args, plan, [], "blocked_incomplete_mapping")
        write_report(report_path, report)
        print_summary(report_path, report)
        return 1

    results: list[dict[str, Any]] = []
    db_updated = 0
    if args.apply or args.db_only:
        r2_settings = None if args.db_only else read_r2_settings(apply=True, args=args)
        db_settings = read_db_settings(args=args)
        if not db_settings:
            raise SystemExit("Missing SUPABASE_DB_PASSWORD or PGPASSWORD for database update.")
        if not args.db_only:
            download_drive_images(drive_images, download_dir, resume=True)
        for item in plan.items:
            if args.db_only:
                thumb_bytes = b""
                medium_bytes = b""
                item_status = "database_only"
            else:
                source_path = download_dir / item.source_path
                thumb_bytes, medium_bytes = create_webp_variants(source_path)
                upload_r2_object(r2_settings, item.thumb_key, thumb_bytes)
                upload_r2_object(r2_settings, item.medium_key, medium_bytes)
                item_status = "uploaded"
            results.append(
                {
                    **asdict(item),
                    "status": item_status,
                    "thumbBytes": len(thumb_bytes),
                    "mediumBytes": len(medium_bytes),
                }
            )
        db_updated = update_database(db_settings, plan.items)
        status = "database_only" if args.db_only else "applied"
    else:
        results = [{**asdict(item), "status": "planned"} for item in plan.items]
        status = "planned"

    report = build_report(args, plan, results, status)
    report["databaseRowsUpdated"] = db_updated
    write_report(report_path, report)
    print_summary(report_path, report)
    return 0 if not plan.missing_labels and not plan.unmatched_files and not plan.duplicate_labels else 2


def build_report(args: argparse.Namespace, plan: SyncPlan, results: list[dict[str, Any]], status: str) -> dict[str, Any]:
    match_counts = Counter(item.match_reason.split(":", 1)[0] for item in plan.items)
    return {
        "generatedAt": utc_now_iso(),
        "mode": "food-catalog-image-sync",
        "status": status,
        "apply": bool(args.apply),
        "dbOnly": bool(args.db_only),
        "folderId": args.folder_id,
        "downloadDir": str(Path(args.download_dir).resolve()),
        "summary": plan.summary,
        "matchCounts": dict(sorted(match_counts.items())),
        "missingLabels": plan.missing_labels,
        "duplicateLabels": plan.duplicate_labels,
        "unmatchedFiles": plan.unmatched_files,
        "results": results,
    }


def print_summary(report_path: Path, report: dict[str, Any]) -> None:
    summary = report["summary"]
    print("Food catalog image sync")
    print(f"  - status: {report['status']}")
    print(f"  - apply: {report['apply']}")
    print(f"  - drive images: {summary['driveImageCount']}")
    print(f"  - mapped: {summary['mappedCount']}/{summary['catalogCount']}")
    print(f"  - missing labels: {summary['missingCount']}")
    print(f"  - duplicate labels: {summary['duplicateLabelCount']}")
    print(f"  - unmatched files: {summary['unmatchedFileCount']}")
    if "databaseRowsUpdated" in report:
        print(f"  - database rows updated: {report['databaseRowsUpdated']}")
    print(f"  - report: {report_path.resolve()}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Sync Drive food catalog images to Cloudflare R2")
    parser.add_argument("--folder-id", default=DEFAULT_FOLDER_ID, help="Google Drive folder id")
    parser.add_argument("--download-dir", default=str(DEFAULT_DOWNLOAD_DIR), help="Local image cache directory")
    parser.add_argument("--output", default=str(DEFAULT_REPORT), help="JSON report path")
    parser.add_argument("--apply", action="store_true", help="Upload R2 objects and update FoodItem.ThumbNail")
    parser.add_argument("--db-only", action="store_true", help="Only update FoodItem.ThumbNail after objects already exist in R2")
    parser.add_argument("--require-complete", action="store_true", help="Fail if any catalog label is not mapped")
    parser.add_argument("--r2-account-id", help="Cloudflare R2 account id")
    parser.add_argument("--r2-bucket", default=R2_BUCKET_DEFAULT, help="Cloudflare R2 bucket")
    parser.add_argument("--r2-access-key-id", help="Cloudflare R2 access key id")
    parser.add_argument("--r2-secret-access-key", help="Cloudflare R2 secret access key")
    parser.add_argument("--r2-public-base-url", default="", help="R2 public bucket URL or custom domain")
    parser.add_argument("--db-host", help="Supabase/Postgres host")
    parser.add_argument("--db-port", help="Supabase/Postgres port")
    parser.add_argument("--db-name", help="Database name")
    parser.add_argument("--db-user", help="Database user")
    parser.add_argument("--db-password", help="Database password")
    parser.add_argument("--sslmode", help="Postgres sslmode")
    parser.add_argument("--connect-timeout", help="Postgres connect timeout")
    parser.add_argument("--current-project-ref", help="Supabase project ref for default db user")
    return parser


def main() -> int:
    return run(build_parser().parse_args())


if __name__ == "__main__":
    sys.exit(main())
