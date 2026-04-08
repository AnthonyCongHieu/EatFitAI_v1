#!/usr/bin/env python3
"""Cloud maintenance helpers for EatFitAI Supabase media and storage."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.request
import zipfile
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import quote, urlparse

try:
    import psycopg
except ImportError as exc:  # pragma: no cover - import guard for operator machines
    raise SystemExit(
        "Missing dependency: psycopg. Install with `pip install psycopg[binary]` before running this script."
    ) from exc


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SQL_PATH = REPO_ROOT / "eatfitai-backend" / "supabase_storage.sql"
DEFAULT_ARCHIVE_PATH = REPO_ROOT / "_state" / "tmp" / "ddgwaufaifqohcxbwfcm.storage.zip"
HTTP_TIMEOUT = 30


@dataclass(frozen=True)
class Settings:
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
    service_role_key: str

    @property
    def current_supabase_host(self) -> str:
        return f"{self.current_project_ref}.supabase.co"

    @property
    def legacy_supabase_host(self) -> str:
        return f"{self.legacy_project_ref}.supabase.co"

    @property
    def current_public_base(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/storage/v1/object/public"

    @property
    def legacy_public_base(self) -> str:
        return f"https://{self.legacy_supabase_host}/storage/v1/object/public"

    @property
    def has_storage_admin(self) -> bool:
        return bool(self.supabase_url and self.service_role_key)


@dataclass(frozen=True)
class ArchiveObject:
    bucket: str
    object_path: str
    archive_name: str
    content_type: str
    size: int


def read_settings(args: argparse.Namespace) -> Settings:
    password = (
        args.db_password
        or os.environ.get("SUPABASE_DB_PASSWORD")
        or os.environ.get("PGPASSWORD")
        or ""
    ).strip()
    if not password:
        raise SystemExit("SUPABASE_DB_PASSWORD is required.")

    current_project_ref = (args.current_project_ref or "bjlmndmafrajjysenpbm").strip()
    supabase_url = (
        args.supabase_url
        or os.environ.get("SUPABASE_URL")
        or f"https://{current_project_ref}.supabase.co"
    ).strip()
    service_role_key = (
        args.service_role_key
        or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_SERVICE_ROLE")
        or ""
    ).strip()

    return Settings(
        host=(args.db_host or os.environ.get("SUPABASE_DB_HOST") or "aws-1-ap-southeast-1.pooler.supabase.com").strip(),
        port=int((args.db_port or os.environ.get("SUPABASE_DB_PORT") or "5432").strip()),
        database=(args.db_name or os.environ.get("SUPABASE_DB_NAME") or "postgres").strip(),
        user=(args.db_user or os.environ.get("SUPABASE_DB_USER") or "postgres.bjlmndmafrajjysenpbm").strip(),
        password=password,
        sslmode=(args.sslmode or os.environ.get("SUPABASE_DB_SSLMODE") or "require").strip(),
        connect_timeout=int((args.connect_timeout or os.environ.get("SUPABASE_DB_CONNECT_TIMEOUT") or "15").strip()),
        current_project_ref=current_project_ref,
        legacy_project_ref=(args.legacy_project_ref or "ddgwaufaifqohcxbwfcm").strip(),
        supabase_url=supabase_url,
        service_role_key=service_role_key,
    )


def connect(settings: Settings):
    return psycopg.connect(
        host=settings.host,
        port=settings.port,
        dbname=settings.database,
        user=settings.user,
        password=settings.password,
        sslmode=settings.sslmode,
        connect_timeout=settings.connect_timeout,
    )


def fetch_scalar(cursor, sql: str) -> int:
    cursor.execute(sql)
    row = cursor.fetchone()
    return int(row[0]) if row else 0


def print_counter(title: str, counter: Counter[str]) -> None:
    print(title)
    for key in sorted(counter):
        print(f"  - {key}: {counter[key]}")


def iter_rows(cursor, sql: str) -> Iterable[tuple]:
    cursor.execute(sql)
    for row in cursor.fetchall():
        yield row


def encode_object_path(value: str) -> str:
    return "/".join(quote(part.strip(), safe="") for part in value.split("/") if part)


def public_url(settings: Settings, bucket: str, object_path: str) -> str:
    return f"{settings.current_public_base}/{quote(bucket, safe='')}/{encode_object_path(object_path)}"


def parse_public_object_path(url: str | None, bucket: str) -> str | None:
    if not url:
        return None

    marker = f"/storage/v1/object/public/{bucket}/"
    if marker not in url:
        return None

    object_path = url.split(marker, 1)[1].strip()
    return object_path or None


def classify_food_thumbnail(value: str | None, settings: Settings) -> str:
    if not value or not value.strip():
        return "null"

    value = value.strip()
    if not value.startswith(("http://", "https://")):
        return "relative-key"

    parsed = urlparse(value)
    host = (parsed.hostname or "").lower()
    if host == settings.current_supabase_host:
        return "current-project"
    if host == settings.legacy_supabase_host:
        return "legacy-project"
    return "external"


def classify_user_food_thumbnail(value: str | None, settings: Settings) -> str:
    if not value or not value.strip():
        return "null"

    value = value.strip()
    if not value.startswith(("http://", "https://")):
        return "relative-path"

    parsed = urlparse(value)
    host = (parsed.hostname or "").lower()
    if host == settings.current_supabase_host:
        return "current-project"
    if host == settings.legacy_supabase_host:
        return "legacy-project"
    if host == "img.example.com":
        return "placeholder"
    return "external"


def ensure_storage_admin(settings: Settings) -> None:
    if settings.has_storage_admin:
        return
    raise SystemExit(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for storage upload/verification commands."
    )


def open_archive(zip_path: Path) -> zipfile.ZipFile:
    if not zip_path.exists():
        raise SystemExit(f"Archive zip not found: {zip_path}")
    return zipfile.ZipFile(zip_path)


def archive_bucket_objects(zip_path: Path, legacy_project_ref: str, bucket: str) -> list[ArchiveObject]:
    bucket_prefix = f"{legacy_project_ref}/{bucket}/"
    objects: list[ArchiveObject] = []
    with open_archive(zip_path) as zf:
        for info in zf.infolist():
            name = info.filename
            if not name.startswith(bucket_prefix):
                continue
            if name.endswith("/") or name.endswith(".emptyFolderPlaceholder"):
                continue

            object_path = name[len(bucket_prefix) :].strip("/")
            if not object_path:
                continue

            content_type = mimetypes.guess_type(name)[0] or "application/octet-stream"
            objects.append(
                ArchiveObject(
                    bucket=bucket,
                    object_path=object_path,
                    archive_name=name,
                    content_type=content_type,
                    size=info.file_size,
                )
            )
    return objects


def http_request(
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    data: bytes | None = None,
) -> tuple[int, bytes]:
    request = urllib.request.Request(url, method=method, headers=headers or {}, data=data)
    try:
        with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read()


def public_asset_exists(url: str) -> bool:
    for method in ("HEAD", "GET"):
        status, _ = http_request(method, url)
        if status == 200:
            return True
        if status not in (403, 405):
            return False
    return False


def upload_archive_object(settings: Settings, archive_bytes: bytes, archive_object: ArchiveObject) -> tuple[int, bytes]:
    ensure_storage_admin(settings)
    url = (
        f"{settings.supabase_url.rstrip('/')}/storage/v1/object/"
        f"{quote(archive_object.bucket, safe='')}/{encode_object_path(archive_object.object_path)}"
    )
    headers = {
        "Authorization": f"Bearer {settings.service_role_key}",
        "apikey": settings.service_role_key,
        "x-upsert": "true",
        "Content-Type": archive_object.content_type,
    }
    return http_request("POST", url, headers=headers, data=archive_bytes)


def archive_manifest(bucket: str, zip_path: Path, settings: Settings) -> set[str]:
    return {
        archive_object.object_path
        for archive_object in archive_bucket_objects(zip_path, settings.legacy_project_ref, bucket)
    }


def run_audit(
    settings: Settings,
    archive_path: Path | None = None,
    verify_public_assets: bool = False,
) -> int:
    archive_food_manifest = archive_manifest("food-images", archive_path, settings) if archive_path else set()
    archive_user_manifest = archive_manifest("user-food", archive_path, settings) if archive_path else set()

    with connect(settings) as conn, conn.cursor() as cursor:
        total_food_items = fetch_scalar(cursor, 'select count(*) from public."FoodItem"')
        total_user_food = fetch_scalar(cursor, 'select count(*) from public."UserFoodItem"')
        total_meal_diary = fetch_scalar(cursor, 'select count(*) from public."MealDiary"')
        total_users = fetch_scalar(cursor, 'select count(*) from public."Users"')

        cursor.execute("select id, name, public from storage.buckets order by id")
        buckets = cursor.fetchall()

        food_counter: Counter[str] = Counter()
        food_archive_counter: Counter[str] = Counter()
        food_public_counter: Counter[str] = Counter()
        bad_food_samples: list[str] = []
        for _, url in iter_rows(
            cursor,
            'select "FoodItemId", "ThumbNail" from public."FoodItem" order by "FoodItemId"',
        ):
            status = classify_food_thumbnail(url, settings)
            food_counter[status] += 1
            if status in {"legacy-project", "external"} and url and len(bad_food_samples) < 5:
                bad_food_samples.append(url)

            object_path = parse_public_object_path(url, "food-images")
            if archive_path and object_path:
                archive_status = "archive-present" if object_path in archive_food_manifest else "archive-missing"
                food_archive_counter[archive_status] += 1

            if verify_public_assets and status == "current-project" and object_path:
                reachable = public_asset_exists(public_url(settings, "food-images", object_path))
                food_public_counter["public-ok" if reachable else "public-missing"] += 1

        user_counter: Counter[str] = Counter()
        user_archive_counter: Counter[str] = Counter()
        user_public_counter: Counter[str] = Counter()
        bad_user_samples: list[str] = []
        for _, url in iter_rows(
            cursor,
            'select "UserFoodItemId", "ThumbnailUrl" from public."UserFoodItem" order by "UserFoodItemId"',
        ):
            status = classify_user_food_thumbnail(url, settings)
            user_counter[status] += 1
            if status in {"legacy-project", "placeholder"} and url and len(bad_user_samples) < 5:
                bad_user_samples.append(url)

            object_path = parse_public_object_path(url, "user-food")
            if archive_path and object_path:
                archive_status = "archive-present" if object_path in archive_user_manifest else "archive-missing"
                user_archive_counter[archive_status] += 1

            if verify_public_assets and status == "current-project" and object_path:
                reachable = public_asset_exists(public_url(settings, "user-food", object_path))
                user_public_counter["public-ok" if reachable else "public-missing"] += 1

        print("EatFitAI Supabase cloud audit")
        print(f"  - host: {settings.host}:{settings.port}")
        print(f"  - database: {settings.database}")
        print(f"  - user: {settings.user}")
        print(f"  - current project: {settings.current_project_ref}")
        print(f"  - legacy project: {settings.legacy_project_ref}")
        print("")
        print("Core tables")
        print(f"  - FoodItem: {total_food_items}")
        print(f"  - UserFoodItem: {total_user_food}")
        print(f"  - MealDiary: {total_meal_diary}")
        print(f"  - Users: {total_users}")
        print("")
        print("Buckets")
        if buckets:
            for bucket_id, name, is_public in buckets:
                print(f"  - {bucket_id} ({name}), public={is_public}")
        else:
            print("  - none")
        print("")
        print_counter("FoodItem thumbnail status", food_counter)
        if archive_path:
            print_counter("FoodItem archive coverage", food_archive_counter)
        if verify_public_assets:
            print_counter("FoodItem current public availability", food_public_counter)
        if bad_food_samples:
            print("  - sample problematic FoodItem URLs:")
            for sample in bad_food_samples:
                print(f"    {sample}")
        print("")
        print_counter("UserFoodItem thumbnail status", user_counter)
        if archive_path:
            print_counter("UserFoodItem archive coverage", user_archive_counter)
        if verify_public_assets:
            print_counter("UserFoodItem current public availability", user_public_counter)
        if bad_user_samples:
            print("  - sample problematic UserFoodItem URLs:")
            for sample in bad_user_samples:
                print(f"    {sample}")

        has_issues = (
            food_counter.get("legacy-project", 0) > 0
            or user_counter.get("legacy-project", 0) > 0
            or user_counter.get("placeholder", 0) > 0
            or food_public_counter.get("public-missing", 0) > 0
            or user_public_counter.get("public-missing", 0) > 0
        )
        return 1 if has_issues else 0


def run_bootstrap_storage(settings: Settings, sql_path: Path) -> int:
    if not sql_path.exists():
        raise SystemExit(f"SQL file not found: {sql_path}")

    sql = sql_path.read_text(encoding="utf-8")
    with connect(settings) as conn, conn.cursor() as cursor:
        cursor.execute(sql)
        conn.commit()

    print(f"Applied storage bootstrap SQL: {sql_path}")
    return 0


def run_restore_storage_archive(
    settings: Settings,
    zip_path: Path,
    bucket: str,
    apply: bool,
    verify_public_assets: bool,
) -> int:
    objects = archive_bucket_objects(zip_path, settings.legacy_project_ref, bucket)
    if not objects:
        print(f"No archive objects found for bucket '{bucket}' in {zip_path}")
        return 0

    total_bytes = sum(obj.size for obj in objects)
    print(f"Archive restore preview for bucket '{bucket}'")
    print(f"  - zip: {zip_path}")
    print(f"  - objects: {len(objects)}")
    print(f"  - bytes: {total_bytes}")

    if not apply:
        print("Dry-run only. No storage objects uploaded.")
        return 0

    ensure_storage_admin(settings)

    uploaded = 0
    failed = 0
    verified_ok = 0
    verified_missing = 0
    with open_archive(zip_path) as zf:
        for archive_object in objects:
            payload = zf.read(archive_object.archive_name)
            status, response_body = upload_archive_object(settings, payload, archive_object)
            if 200 <= status < 300:
                uploaded += 1
            else:
                failed += 1
                body_text = response_body.decode("utf-8", errors="replace")
                print(
                    f"Upload failed: bucket={archive_object.bucket} path={archive_object.object_path} status={status} body={body_text}"
                )
                continue

            if verify_public_assets:
                reachable = public_asset_exists(public_url(settings, archive_object.bucket, archive_object.object_path))
                if reachable:
                    verified_ok += 1
                else:
                    verified_missing += 1
                    print(
                        f"Public verification failed: bucket={archive_object.bucket} path={archive_object.object_path}"
                    )

    print(f"Uploaded: {uploaded}")
    print(f"Failed: {failed}")
    if verify_public_assets:
        print(f"Verified public-ok: {verified_ok}")
        print(f"Verified public-missing: {verified_missing}")

    return 1 if failed > 0 or verified_missing > 0 else 0


def run_media_migration(
    settings: Settings,
    apply: bool,
    scope: str,
    archive_path: Path | None,
    verify_current_public: bool,
) -> int:
    current_food_base = f"{settings.current_public_base}/food-images/"
    legacy_food_base = f"{settings.legacy_public_base}/food-images/"
    current_user_food_base = f"{settings.current_public_base}/user-food/"
    legacy_user_food_base = f"{settings.legacy_public_base}/user-food/"
    archive_food_paths = archive_manifest("food-images", archive_path, settings) if archive_path else set()

    with connect(settings) as conn, conn.cursor() as cursor:
        total_changes = 0

        if scope in {"all", "food-items"}:
            cursor.execute(
                '''
                select "FoodItemId", "ThumbNail"
                from public."FoodItem"
                where "ThumbNail" like %(legacy_like)s
                order by "FoodItemId"
                ''',
                {"legacy_like": f"{legacy_food_base}%"},
            )
            rows = cursor.fetchall()

            rewrite_rows = 0
            null_rows = 0
            verified_ok = 0
            verified_missing = 0
            for food_item_id, url in rows:
                object_path = parse_public_object_path(url, "food-images")
                if not object_path:
                    continue

                if archive_path and object_path not in archive_food_paths:
                    new_value = None
                else:
                    new_value = f"{current_food_base}{object_path}"

                if verify_current_public and new_value:
                    reachable = public_asset_exists(new_value)
                    if reachable:
                        verified_ok += 1
                    else:
                        verified_missing += 1
                        new_value = None

                if apply:
                    cursor.execute(
                        'update public."FoodItem" set "ThumbNail" = %(value)s where "FoodItemId" = %(id)s',
                        {"value": new_value, "id": food_item_id},
                    )

                if new_value is None:
                    null_rows += 1
                else:
                    rewrite_rows += 1

            total_changes += rewrite_rows + null_rows
            print(f"FoodItem legacy rows scanned: {len(rows)}")
            print(f"FoodItem rewrite rows: {rewrite_rows}")
            print(f"FoodItem null rows: {null_rows}")
            if verify_current_public:
                print(f"FoodItem public-ok: {verified_ok}")
                print(f"FoodItem public-missing: {verified_missing}")

        if scope in {"all", "user-food"}:
            statements = [
                (
                    "UserFoodItem legacy host rewrite",
                    '''
                    update public."UserFoodItem"
                    set "ThumbnailUrl" = replace("ThumbnailUrl", %(legacy)s, %(current)s)
                    where "ThumbnailUrl" like %(legacy_like)s
                    ''',
                    {
                        "legacy": legacy_user_food_base,
                        "current": current_user_food_base,
                        "legacy_like": f"{legacy_user_food_base}%",
                    },
                ),
                (
                    "UserFoodItem placeholder cleanup",
                    '''
                    update public."UserFoodItem"
                    set "ThumbnailUrl" = null
                    where lower(coalesce("ThumbnailUrl", '')) like %(placeholder_http)s
                       or lower(coalesce("ThumbnailUrl", '')) like %(placeholder_https)s
                    ''',
                    {
                        "placeholder_http": "http://img.example.com/%",
                        "placeholder_https": "https://img.example.com/%",
                    },
                ),
            ]

            for label, sql, params in statements:
                cursor.execute(sql, params)
                rowcount = cursor.rowcount
                total_changes += rowcount
                print(f"{label}: {rowcount} row(s)")

        if apply:
            conn.commit()
            print(f"Committed {total_changes} total row change(s).")
        else:
            conn.rollback()
            print("Dry-run only. Rolled back all changes.")

    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="EatFitAI Supabase cloud operations")
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
    parser.add_argument("--service-role-key", help="Current Supabase service role key")

    subparsers = parser.add_subparsers(dest="command", required=True)

    audit_parser = subparsers.add_parser("audit", help="Audit rows, buckets, and thumbnail URL health")
    audit_parser.add_argument(
        "--archive-path",
        default="",
        help="Optional path to legacy storage archive zip for object coverage checks",
    )
    audit_parser.add_argument(
        "--verify-public-assets",
        action="store_true",
        help="Verify current-project public URLs are reachable",
    )
    audit_parser.set_defaults(
        handler=lambda args, settings: run_audit(
            settings,
            archive_path=Path(args.archive_path) if args.archive_path else None,
            verify_public_assets=args.verify_public_assets,
        )
    )

    bootstrap_parser = subparsers.add_parser("bootstrap-storage", help="Apply Supabase storage bootstrap SQL")
    bootstrap_parser.add_argument(
        "--sql-path",
        default=str(DEFAULT_SQL_PATH),
        help="Path to supabase_storage.sql",
    )
    bootstrap_parser.set_defaults(
        handler=lambda args, settings: run_bootstrap_storage(settings, Path(args.sql_path))
    )

    restore_parser = subparsers.add_parser(
        "restore-storage-archive",
        help="Upload legacy storage archive objects into the current Supabase bucket",
    )
    restore_parser.add_argument(
        "--zip-path",
        default=str(DEFAULT_ARCHIVE_PATH),
        help="Path to the legacy Supabase storage zip archive",
    )
    restore_parser.add_argument(
        "--bucket",
        choices=["food-images", "user-food"],
        default="food-images",
        help="Bucket to restore from the archive",
    )
    restore_parser.add_argument(
        "--apply",
        action="store_true",
        help="Upload objects instead of dry-run preview",
    )
    restore_parser.add_argument(
        "--verify-public-assets",
        action="store_true",
        help="Verify uploaded objects are reachable via current public URLs",
    )
    restore_parser.set_defaults(
        handler=lambda args, settings: run_restore_storage_archive(
            settings,
            Path(args.zip_path),
            bucket=args.bucket,
            apply=args.apply,
            verify_public_assets=args.verify_public_assets,
        )
    )

    migrate_parser = subparsers.add_parser("migrate-media-urls", help="Rewrite legacy Supabase URLs and null placeholder URLs")
    migrate_parser.add_argument(
        "--apply",
        action="store_true",
        help="Commit changes instead of rolling them back",
    )
    migrate_parser.add_argument(
        "--scope",
        choices=["all", "food-items", "user-food"],
        default="all",
        help="Choose which thumbnail lane to migrate",
    )
    migrate_parser.add_argument(
        "--archive-path",
        default="",
        help="Optional path to legacy storage archive zip; only matching objects are rewritten",
    )
    migrate_parser.add_argument(
        "--verify-current-public",
        action="store_true",
        help="Verify current public URLs before rewriting FoodItem rows",
    )
    migrate_parser.set_defaults(
        handler=lambda args, settings: run_media_migration(
            settings,
            apply=args.apply,
            scope=args.scope,
            archive_path=Path(args.archive_path) if args.archive_path else None,
            verify_current_public=args.verify_current_public,
        )
    )

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    settings = read_settings(args)
    return args.handler(args, settings)


if __name__ == "__main__":
    sys.exit(main())
