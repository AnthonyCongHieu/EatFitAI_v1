#!/usr/bin/env python3
"""Audit and migrate catalog media away from Supabase Storage egress.

This script is intentionally conservative:
- catalog-audit reads database/storage metadata only.
- catalog-migrate is dry-run unless --apply is provided.
- catalog-migrate prefers a local Supabase storage archive and refuses to
  download Supabase public media unless --allow-supabase-download is set.
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import sys
import urllib.error
import urllib.request
import zipfile
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.parse import quote, unquote, urlparse


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ARCHIVE_PATH = REPO_ROOT / "_state" / "tmp" / "ddgwaufaifqohcxbwfcm.storage.zip"
DEFAULT_R2_BUCKET = "eatfitai-media"
FOOD_BUCKET = "food-images"
THUMB_MAX_BYTES = 100 * 1024
MEDIUM_MAX_BYTES = 350 * 1024
MAX_SOURCE_BYTES = 8 * 1024 * 1024
CACHE_CONTROL_IMMUTABLE = "public, max-age=31536000, immutable"
HTTP_TIMEOUT = 30


@dataclass(frozen=True)
class DbSettings:
    host: str
    port: int
    database: str
    user: str
    password: str
    sslmode: str
    connect_timeout: int
    current_project_ref: str
    legacy_project_ref: str
    supabase_url: str

    @property
    def current_public_base(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/storage/v1/object/public"


@dataclass(frozen=True)
class R2Settings:
    account_id: str
    bucket: str
    access_key_id: str
    secret_access_key: str
    public_base_url: str

    @property
    def endpoint_url(self) -> str:
        return f"https://{self.account_id}.r2.cloudflarestorage.com"


@dataclass(frozen=True)
class CatalogCandidate:
    food_item_id: int
    current_thumbnail: str
    source_object_path: str
    thumb_key: str
    medium_key: str
    reason: str


def trim(value: Any) -> str:
    return str(value or "").strip()


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def read_db_settings(args: argparse.Namespace) -> DbSettings:
    password = trim(
        args.db_password
        or os.environ.get("SUPABASE_DB_PASSWORD")
        or os.environ.get("PGPASSWORD")
    )
    if not password:
        raise SystemExit("SUPABASE_DB_PASSWORD is required.")

    current_project_ref = trim(args.current_project_ref or "bjlmndmafrajjysenpbm")
    supabase_url = trim(
        args.supabase_url
        or os.environ.get("SUPABASE_URL")
        or f"https://{current_project_ref}.supabase.co"
    )

    return DbSettings(
        host=trim(args.db_host or os.environ.get("SUPABASE_DB_HOST") or "aws-1-ap-southeast-1.pooler.supabase.com"),
        port=int(trim(args.db_port or os.environ.get("SUPABASE_DB_PORT") or "5432")),
        database=trim(args.db_name or os.environ.get("SUPABASE_DB_NAME") or "postgres"),
        user=trim(args.db_user or os.environ.get("SUPABASE_DB_USER") or f"postgres.{current_project_ref}"),
        password=password,
        sslmode=trim(args.sslmode or os.environ.get("SUPABASE_DB_SSLMODE") or "require"),
        connect_timeout=int(trim(args.connect_timeout or os.environ.get("SUPABASE_DB_CONNECT_TIMEOUT") or "15")),
        current_project_ref=current_project_ref,
        legacy_project_ref=trim(args.legacy_project_ref or "ddgwaufaifqohcxbwfcm"),
        supabase_url=supabase_url,
    )


def read_r2_settings(args: argparse.Namespace) -> R2Settings:
    settings = R2Settings(
        account_id=trim(args.r2_account_id or os.environ.get("R2_ACCOUNT_ID")),
        bucket=trim(args.r2_bucket or os.environ.get("R2_BUCKET") or DEFAULT_R2_BUCKET),
        access_key_id=trim(args.r2_access_key_id or os.environ.get("R2_ACCESS_KEY_ID")),
        secret_access_key=trim(args.r2_secret_access_key or os.environ.get("R2_SECRET_ACCESS_KEY")),
        public_base_url=trim(args.r2_public_base_url or os.environ.get("R2_PUBLIC_BASE_URL")),
    )
    missing = [
        name
        for name, value in (
            ("R2_ACCOUNT_ID", settings.account_id),
            ("R2_BUCKET", settings.bucket),
            ("R2_ACCESS_KEY_ID", settings.access_key_id),
            ("R2_SECRET_ACCESS_KEY", settings.secret_access_key),
            ("R2_PUBLIC_BASE_URL", settings.public_base_url),
        )
        if not value
    ]
    if missing:
        raise SystemExit(f"Missing R2 setting(s): {', '.join(missing)}")
    return settings


def connect(settings: DbSettings):
    try:
        import psycopg
    except ImportError as exc:  # pragma: no cover - import guard for operator machines
        raise SystemExit(
            "Missing dependency: psycopg. Install with `pip install psycopg[binary]`."
        ) from exc

    return psycopg.connect(
        host=settings.host,
        port=settings.port,
        dbname=settings.database,
        user=settings.user,
        password=settings.password,
        sslmode=settings.sslmode,
        connect_timeout=settings.connect_timeout,
    )


def strip_query(value: str) -> str:
    return value.split("?", 1)[0].split("#", 1)[0]


def parse_supabase_public_object_path(value: str, bucket: str) -> str | None:
    raw = trim(value)
    if not raw:
        return None

    marker = f"/storage/v1/object/public/{bucket}/"
    try:
        parsed_path = urlparse(raw).path
    except ValueError:
        parsed_path = raw

    if marker not in parsed_path:
        return None

    return unquote(strip_query(parsed_path.split(marker, 1)[1]).lstrip("/")) or None


def resolve_food_thumbnail_object_path(value: str | None) -> str | None:
    raw = trim(value)
    if not raw:
        return None

    full_path = parse_supabase_public_object_path(raw, FOOD_BUCKET)
    if full_path:
        return full_path

    if raw.startswith(("http://", "https://", "data:")):
        return None

    relative = unquote(strip_query(raw).replace("\\", "/").lstrip("/"))
    if relative.startswith(f"{FOOD_BUCKET}/"):
        relative = relative[len(FOOD_BUCKET) + 1 :]
    if relative.startswith(("thumbnails/", "original/", "v2/")):
        return relative
    return f"thumbnails/{relative}"


def is_v2_thumb_path(object_path: str | None) -> bool:
    return bool(object_path and object_path.startswith("v2/thumb/") and object_path.endswith(".webp"))


def is_legacy_catalog_path(object_path: str | None) -> bool:
    return bool(object_path and not is_v2_thumb_path(object_path))


def variant_keys(food_item_id: int) -> tuple[str, str]:
    return (
        f"{FOOD_BUCKET}/v2/thumb/{food_item_id}.webp",
        f"{FOOD_BUCKET}/v2/medium/{food_item_id}.webp",
    )


def build_r2_public_url(public_base_url: str, object_key: str) -> str:
    return f"{public_base_url.rstrip('/')}/{object_key.lstrip('/')}"


def normalize_metadata(metadata: Any) -> dict[str, Any]:
    if isinstance(metadata, dict):
        return metadata
    if isinstance(metadata, str) and metadata.strip():
        try:
            parsed = json.loads(metadata)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def metadata_size(metadata: Any) -> int | None:
    data = normalize_metadata(metadata)
    for key in ("size", "contentLength", "content-length", "Content-Length"):
        value = data.get(key)
        try:
            if value is not None:
                return int(value)
        except (TypeError, ValueError):
            continue
    return None


def metadata_cache_control(metadata: Any) -> str:
    data = normalize_metadata(metadata)
    for key in ("cacheControl", "cache-control", "Cache-Control"):
        value = trim(data.get(key))
        if value:
            return value
    return ""


def fetch_storage_metadata(cursor) -> dict[tuple[str, str], dict[str, Any]]:
    cursor.execute(
        """
        select bucket_id, name, metadata
        from storage.objects
        where bucket_id in ('food-images', 'user-food')
        """
    )
    result: dict[tuple[str, str], dict[str, Any]] = {}
    for bucket_id, name, metadata in cursor.fetchall():
        result[(bucket_id, name)] = normalize_metadata(metadata)
    return result


def fetch_catalog_rows(cursor, limit: int) -> list[tuple[int, str]]:
    sql = '''
        select "FoodItemId", "ThumbNail"
        from public."FoodItem"
        where coalesce("ThumbNail", '') <> ''
        order by "FoodItemId"
    '''
    params: dict[str, Any] = {}
    if limit > 0:
        sql += " limit %(limit)s"
        params["limit"] = limit
    cursor.execute(sql, params)
    return [(int(row[0]), trim(row[1])) for row in cursor.fetchall()]


def build_catalog_candidate(food_item_id: int, thumbnail: str) -> CatalogCandidate | None:
    object_path = resolve_food_thumbnail_object_path(thumbnail)
    if not is_legacy_catalog_path(object_path):
        return None
    thumb_key, medium_key = variant_keys(food_item_id)
    return CatalogCandidate(
        food_item_id=food_item_id,
        current_thumbnail=thumbnail,
        source_object_path=object_path or "",
        thumb_key=thumb_key,
        medium_key=medium_key,
        reason="legacy-catalog-thumbnail",
    )


def audit_rows(
    rows: list[tuple[int, str]],
    storage_metadata: dict[tuple[str, str], dict[str, Any]],
    sample_limit: int,
) -> dict[str, Any]:
    counts: Counter[str] = Counter()
    violations: list[dict[str, Any]] = []
    candidates: list[dict[str, Any]] = []

    for food_item_id, thumbnail in rows:
        object_path = resolve_food_thumbnail_object_path(thumbnail)
        if object_path is None:
            counts["external-or-unparseable"] += 1
            continue

        metadata = storage_metadata.get((FOOD_BUCKET, object_path), {})
        size = metadata_size(metadata)

        if is_v2_thumb_path(object_path):
            counts["v2-thumb"] += 1
            if size is not None and size > THUMB_MAX_BYTES:
                violations.append(
                    {
                        "kind": "thumb-too-large",
                        "foodItemId": food_item_id,
                        "path": object_path,
                        "bytes": size,
                        "limit": THUMB_MAX_BYTES,
                    }
                )
            cache_control = metadata_cache_control(metadata)
            if cache_control and "immutable" not in cache_control.lower():
                violations.append(
                    {
                        "kind": "cache-control-not-immutable",
                        "foodItemId": food_item_id,
                        "path": object_path,
                        "cacheControl": cache_control,
                    }
                )
            continue

        counts["legacy-catalog-thumbnail"] += 1
        if size is not None and size > THUMB_MAX_BYTES:
            violations.append(
                {
                    "kind": "legacy-thumb-too-large",
                    "foodItemId": food_item_id,
                    "path": object_path,
                    "bytes": size,
                    "limit": THUMB_MAX_BYTES,
                }
            )

        candidate = build_catalog_candidate(food_item_id, thumbnail)
        if candidate and len(candidates) < sample_limit:
            candidates.append(asdict(candidate))

    return {
        "counts": dict(sorted(counts.items())),
        "violationCount": len(violations),
        "violations": violations[:sample_limit],
        "candidateSamples": candidates,
    }


def write_report(path_value: str, report: dict[str, Any]) -> None:
    if not path_value:
        return
    path = Path(path_value)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")


def run_catalog_audit(args: argparse.Namespace, settings: DbSettings) -> int:
    with connect(settings) as conn, conn.cursor() as cursor:
        rows = fetch_catalog_rows(cursor, args.limit)
        storage_metadata = fetch_storage_metadata(cursor)

    report = {
        "generatedAt": utc_now_iso(),
        "mode": "catalog-audit",
        "limits": {
            "thumbMaxBytes": THUMB_MAX_BYTES,
            "mediumMaxBytes": MEDIUM_MAX_BYTES,
            "maxSourceBytes": MAX_SOURCE_BYTES,
        },
        **audit_rows(rows, storage_metadata, args.sample_limit),
    }
    write_report(args.output, report)

    print("Catalog media egress audit")
    print(f"  - rows scanned: {len(rows)}")
    print(f"  - violations: {report['violationCount']}")
    for key, count in report["counts"].items():
        print(f"  - {key}: {count}")
    if args.output:
        print(f"  - report: {Path(args.output).resolve()}")

    return 1 if args.fail_on_violations and report["violationCount"] > 0 else 0


def archive_member_names(settings: DbSettings, object_path: str) -> list[str]:
    clean_path = object_path.lstrip("/")
    return [
        f"{settings.current_project_ref}/{FOOD_BUCKET}/{clean_path}",
        f"{settings.legacy_project_ref}/{FOOD_BUCKET}/{clean_path}",
        f"{FOOD_BUCKET}/{clean_path}",
        clean_path,
    ]


def read_archive_bytes(zf: zipfile.ZipFile, settings: DbSettings, object_path: str) -> bytes | None:
    names = set(zf.namelist())
    for name in archive_member_names(settings, object_path):
        if name in names:
            return zf.read(name)
    return None


def download_supabase_media(settings: DbSettings, object_path: str) -> bytes:
    url = f"{settings.current_public_base}/{FOOD_BUCKET}/{object_path.lstrip('/')}"
    request = urllib.request.Request(url, headers={"Accept": "image/*"})
    try:
        with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT) as response:
            return response.read(MAX_SOURCE_BYTES + 1)
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Failed to download {url}: {exc}") from exc


def resize_webp_variants(source_bytes: bytes) -> tuple[bytes, bytes]:
    try:
        from PIL import Image
    except ImportError as exc:  # pragma: no cover - import guard for operator machines
        raise SystemExit("Missing dependency: Pillow. Install with `pip install Pillow`.") from exc

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

        raise RuntimeError("Unable to encode image variant")

    return encode(320, THUMB_MAX_BYTES), encode(1080, MEDIUM_MAX_BYTES)


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
    canonical_headers_blob = "".join(
        f"{header}:{canonical_headers[header]}\n" for header in sorted(canonical_headers)
    )
    canonical_request = "\n".join(
        [
            "PUT",
            canonical_uri,
            "",
            canonical_headers_blob,
            signed_headers,
            payload_hash,
        ]
    )

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
        sign(
            sign(
                sign(("AWS4" + settings.secret_access_key).encode("utf-8"), date_stamp),
                "auto",
            ),
            "s3",
        ),
        "aws4_request",
    )
    signature = hmac.new(
        signing_key,
        string_to_sign.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    authorization = (
        "AWS4-HMAC-SHA256 "
        f"Credential={settings.access_key_id}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, "
        f"Signature={signature}"
    )

    url = f"https://{host}{canonical_uri}"
    headers = {
        "Authorization": authorization,
        "Cache-Control": CACHE_CONTROL_IMMUTABLE,
        "Content-Type": "image/webp",
        "x-amz-content-sha256": payload_hash,
        "x-amz-date": amz_date,
    }
    return url, headers


def upload_r2_object_via_sigv4(settings: R2Settings, key: str, payload: bytes) -> None:
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


def upload_r2_object(settings: R2Settings, key: str, payload: bytes) -> None:
    try:
        import boto3
    except ImportError as exc:  # pragma: no cover - import guard for operator machines
        upload_r2_object_via_sigv4(settings, key, payload)
        return

    client = boto3.client(
        "s3",
        endpoint_url=settings.endpoint_url,
        region_name="auto",
        aws_access_key_id=settings.access_key_id,
        aws_secret_access_key=settings.secret_access_key,
    )
    client.put_object(
        Bucket=settings.bucket,
        Key=key,
        Body=payload,
        ContentType="image/webp",
        CacheControl=CACHE_CONTROL_IMMUTABLE,
    )


def source_bytes_for_candidate(
    candidate: CatalogCandidate,
    settings: DbSettings,
    archive: zipfile.ZipFile | None,
    allow_supabase_download: bool,
) -> bytes | None:
    if archive:
        payload = read_archive_bytes(archive, settings, candidate.source_object_path)
        if payload:
            return payload

    if allow_supabase_download:
        return download_supabase_media(settings, candidate.source_object_path)

    return None


def run_catalog_migrate(args: argparse.Namespace, settings: DbSettings) -> int:
    r2_settings = read_r2_settings(args) if args.apply else None
    archive_path = Path(args.archive_path) if args.archive_path else None
    archive = None
    if archive_path:
        if archive_path.exists():
            archive = zipfile.ZipFile(archive_path)
        elif args.apply and not args.allow_supabase_download:
            raise SystemExit(f"Archive zip not found: {archive_path}")

    try:
        with connect(settings) as conn, conn.cursor() as cursor:
            rows = fetch_catalog_rows(cursor, args.limit)
            candidates = [
                candidate
                for food_item_id, thumbnail in rows
                if (candidate := build_catalog_candidate(food_item_id, thumbnail))
            ][: args.batch_size]

            report: dict[str, Any] = {
                "generatedAt": utc_now_iso(),
                "mode": "catalog-migrate",
                "apply": bool(args.apply),
                "archivePath": str(archive_path) if archive_path else "",
                "allowSupabaseDownload": bool(args.allow_supabase_download),
                "candidatesFound": len(candidates),
                "results": [],
            }

            for candidate in candidates:
                result = asdict(candidate)
                payload = source_bytes_for_candidate(
                    candidate,
                    settings,
                    archive,
                    args.allow_supabase_download,
                )
                if not payload:
                    result["status"] = "skipped"
                    result["reason"] = "missing-local-source"
                    report["results"].append(result)
                    continue
                if len(payload) > MAX_SOURCE_BYTES:
                    result["status"] = "skipped"
                    result["reason"] = "source-too-large"
                    result["sourceBytes"] = len(payload)
                    report["results"].append(result)
                    continue

                result["sourceBytes"] = len(payload)
                public_base_url = (
                    r2_settings.public_base_url
                    if r2_settings
                    else args.r2_public_base_url or "<R2_PUBLIC_BASE_URL>"
                )
                result["thumbUrl"] = build_r2_public_url(public_base_url, candidate.thumb_key)
                result["mediumUrl"] = build_r2_public_url(public_base_url, candidate.medium_key)

                if args.apply:
                    thumb_bytes, medium_bytes = resize_webp_variants(payload)
                    upload_r2_object(r2_settings, candidate.thumb_key, thumb_bytes)
                    upload_r2_object(r2_settings, candidate.medium_key, medium_bytes)
                    cursor.execute(
                        'update public."FoodItem" set "ThumbNail" = %(thumb_url)s where "FoodItemId" = %(id)s',
                        {
                            "thumb_url": result["thumbUrl"],
                            "id": candidate.food_item_id,
                        },
                    )
                    result["thumbBytes"] = len(thumb_bytes)
                    result["mediumBytes"] = len(medium_bytes)
                    result["status"] = "updated"
                else:
                    result["status"] = "planned"

                report["results"].append(result)

            if args.apply:
                conn.commit()
            else:
                conn.rollback()

        planned = sum(1 for item in report["results"] if item.get("status") == "planned")
        updated = sum(1 for item in report["results"] if item.get("status") == "updated")
        skipped = sum(1 for item in report["results"] if item.get("status") == "skipped")
        report["summary"] = {"planned": planned, "updated": updated, "skipped": skipped}
        write_report(args.output, report)

        print("Catalog media egress migration")
        print(f"  - apply: {bool(args.apply)}")
        print(f"  - candidates: {len(candidates)}")
        print(f"  - planned: {planned}")
        print(f"  - updated: {updated}")
        print(f"  - skipped: {skipped}")
        if not args.apply:
            print("  - dry-run only. No R2 upload or DB update was committed.")
        if args.output:
            print(f"  - report: {Path(args.output).resolve()}")
    finally:
        if archive:
            archive.close()

    return 0


def add_common_db_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--db-host", help="Supabase/Postgres host")
    parser.add_argument("--db-port", help="Supabase/Postgres port")
    parser.add_argument("--db-name", help="Database name")
    parser.add_argument("--db-user", help="Database user")
    parser.add_argument("--db-password", help="Database password")
    parser.add_argument("--sslmode", help="Postgres sslmode")
    parser.add_argument("--connect-timeout", help="Postgres connect timeout in seconds")
    parser.add_argument("--current-project-ref", help="Current Supabase project ref")
    parser.add_argument("--legacy-project-ref", help="Legacy Supabase project ref")
    parser.add_argument("--supabase-url", help="Current Supabase project URL")


def add_r2_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--r2-account-id", help="Cloudflare R2 account id")
    parser.add_argument("--r2-bucket", default=DEFAULT_R2_BUCKET, help="Cloudflare R2 bucket")
    parser.add_argument("--r2-access-key-id", help="Cloudflare R2 access key id")
    parser.add_argument("--r2-secret-access-key", help="Cloudflare R2 secret access key")
    parser.add_argument("--r2-public-base-url", default="", help="R2 public bucket URL or custom domain")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="EatFitAI media egress audit and migration")
    add_common_db_args(parser)
    subparsers = parser.add_subparsers(dest="command", required=True)

    audit_parser = subparsers.add_parser(
        "catalog-audit",
        help="Audit catalog thumbnail rows and Supabase storage metadata",
    )
    audit_parser.add_argument("--limit", type=int, default=0, help="Limit FoodItem rows scanned")
    audit_parser.add_argument("--sample-limit", type=int, default=20, help="Sample count in report")
    audit_parser.add_argument("--output", default="", help="Optional JSON report path")
    audit_parser.add_argument(
        "--fail-on-violations",
        action="store_true",
        help="Exit non-zero when oversize or cache violations are found",
    )
    audit_parser.set_defaults(handler=run_catalog_audit)

    migrate_parser = subparsers.add_parser(
        "catalog-migrate",
        help="Create R2 v2 variants for legacy catalog thumbnails and update FoodItem.ThumbNail",
    )
    migrate_parser.add_argument("--limit", type=int, default=0, help="Limit FoodItem rows scanned")
    migrate_parser.add_argument("--batch-size", type=int, default=25, help="Max rows processed in this run")
    migrate_parser.add_argument(
        "--archive-path",
        default=str(DEFAULT_ARCHIVE_PATH),
        help="Supabase storage archive zip to use as source media",
    )
    migrate_parser.add_argument(
        "--allow-supabase-download",
        action="store_true",
        help="Allow downloading current Supabase public media when the archive is missing",
    )
    migrate_parser.add_argument("--apply", action="store_true", help="Upload to R2 and update DB")
    migrate_parser.add_argument("--output", default="", help="Optional JSON report path")
    add_r2_args(migrate_parser)
    migrate_parser.set_defaults(handler=run_catalog_migrate)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    settings = read_db_settings(args)
    return args.handler(args, settings)


if __name__ == "__main__":
    sys.exit(main())
