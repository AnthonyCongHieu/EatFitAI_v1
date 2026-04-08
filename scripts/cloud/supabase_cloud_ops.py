#!/usr/bin/env python3
"""Cloud maintenance helpers for EatFitAI Supabase media and storage."""

from __future__ import annotations

import argparse
import os
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse

try:
    import psycopg
except ImportError as exc:  # pragma: no cover - import guard for operator machines
    raise SystemExit(
        "Missing dependency: psycopg. Install with `pip install psycopg[binary]` before running this script."
    ) from exc


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SQL_PATH = REPO_ROOT / "eatfitai-backend" / "supabase_storage.sql"


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

    @property
    def current_supabase_host(self) -> str:
        return f"{self.current_project_ref}.supabase.co"

    @property
    def legacy_supabase_host(self) -> str:
        return f"{self.legacy_project_ref}.supabase.co"

    @property
    def current_public_base(self) -> str:
        return f"https://{self.current_supabase_host}/storage/v1/object/public"

    @property
    def legacy_public_base(self) -> str:
        return f"https://{self.legacy_supabase_host}/storage/v1/object/public"


def read_settings(args: argparse.Namespace) -> Settings:
    password = (
        args.db_password
        or os.environ.get("SUPABASE_DB_PASSWORD")
        or os.environ.get("PGPASSWORD")
        or ""
    ).strip()
    if not password:
        raise SystemExit("SUPABASE_DB_PASSWORD is required.")

    return Settings(
        host=(args.db_host or os.environ.get("SUPABASE_DB_HOST") or "aws-1-ap-southeast-1.pooler.supabase.com").strip(),
        port=int((args.db_port or os.environ.get("SUPABASE_DB_PORT") or "5432").strip()),
        database=(args.db_name or os.environ.get("SUPABASE_DB_NAME") or "postgres").strip(),
        user=(args.db_user or os.environ.get("SUPABASE_DB_USER") or "postgres.bjlmndmafrajjysenpbm").strip(),
        password=password,
        sslmode=(args.sslmode or os.environ.get("SUPABASE_DB_SSLMODE") or "require").strip(),
        connect_timeout=int((args.connect_timeout or os.environ.get("SUPABASE_DB_CONNECT_TIMEOUT") or "15").strip()),
        current_project_ref=(args.current_project_ref or "bjlmndmafrajjysenpbm").strip(),
        legacy_project_ref=(args.legacy_project_ref or "ddgwaufaifqohcxbwfcm").strip(),
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


def run_audit(settings: Settings) -> int:
    with connect(settings) as conn, conn.cursor() as cursor:
        total_food_items = fetch_scalar(cursor, 'select count(*) from public."FoodItem"')
        total_user_food = fetch_scalar(cursor, 'select count(*) from public."UserFoodItem"')
        total_meal_diary = fetch_scalar(cursor, 'select count(*) from public."MealDiary"')
        total_users = fetch_scalar(cursor, 'select count(*) from public."Users"')

        cursor.execute("select id, name, public from storage.buckets order by id")
        buckets = cursor.fetchall()

        food_counter: Counter[str] = Counter()
        bad_food_samples: list[str] = []
        for _, url in iter_rows(
            cursor,
            'select "FoodItemId", "ThumbNail" from public."FoodItem" order by "FoodItemId"',
        ):
            status = classify_food_thumbnail(url, settings)
            food_counter[status] += 1
            if status in {"legacy-project", "external"} and url and len(bad_food_samples) < 5:
                bad_food_samples.append(url)

        user_counter: Counter[str] = Counter()
        bad_user_samples: list[str] = []
        for _, url in iter_rows(
            cursor,
            'select "UserFoodItemId", "ThumbnailUrl" from public."UserFoodItem" order by "UserFoodItemId"',
        ):
            status = classify_user_food_thumbnail(url, settings)
            user_counter[status] += 1
            if status in {"legacy-project", "placeholder"} and url and len(bad_user_samples) < 5:
                bad_user_samples.append(url)

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
        if bad_food_samples:
            print("  - sample problematic FoodItem URLs:")
            for sample in bad_food_samples:
                print(f"    {sample}")
        print("")
        print_counter("UserFoodItem thumbnail status", user_counter)
        if bad_user_samples:
            print("  - sample problematic UserFoodItem URLs:")
            for sample in bad_user_samples:
                print(f"    {sample}")

        has_issues = (
            food_counter.get("legacy-project", 0) > 0
            or user_counter.get("legacy-project", 0) > 0
            or user_counter.get("placeholder", 0) > 0
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


def run_media_migration(settings: Settings, apply: bool, scope: str) -> int:
    current_food_base = f"{settings.current_public_base}/food-images/"
    legacy_food_base = f"{settings.legacy_public_base}/food-images/"
    current_user_food_base = f"{settings.current_public_base}/user-food/"
    legacy_user_food_base = f"{settings.legacy_public_base}/user-food/"

    statements = []
    if scope in {"all", "food-items"}:
        statements.append(
            (
                "FoodItem legacy host rewrite",
                '''
                update public."FoodItem"
                set "ThumbNail" = replace("ThumbNail", %(legacy)s, %(current)s)
                where "ThumbNail" like %(legacy_like)s
                ''',
                {
                    "legacy": legacy_food_base,
                    "current": current_food_base,
                    "legacy_like": f"{legacy_food_base}%",
                },
            )
        )

    if scope in {"all", "user-food"}:
        statements.extend(
            [
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
        )

    with connect(settings) as conn, conn.cursor() as cursor:
        total_changes = 0
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

    subparsers = parser.add_subparsers(dest="command", required=True)

    audit_parser = subparsers.add_parser("audit", help="Audit rows, buckets, and thumbnail URL health")
    audit_parser.set_defaults(handler=lambda args, settings: run_audit(settings))

    bootstrap_parser = subparsers.add_parser("bootstrap-storage", help="Apply Supabase storage bootstrap SQL")
    bootstrap_parser.add_argument(
        "--sql-path",
        default=str(DEFAULT_SQL_PATH),
        help="Path to supabase_storage.sql",
    )
    bootstrap_parser.set_defaults(
        handler=lambda args, settings: run_bootstrap_storage(settings, Path(args.sql_path))
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
    migrate_parser.set_defaults(
        handler=lambda args, settings: run_media_migration(
            settings,
            apply=args.apply,
            scope=args.scope,
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
