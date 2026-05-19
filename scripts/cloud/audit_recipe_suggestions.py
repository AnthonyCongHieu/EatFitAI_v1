#!/usr/bin/env python3
"""Read-only audit for production recipe suggestion readiness."""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass


DEFAULT_HOST = "aws-1-ap-southeast-1.pooler.supabase.com"
DEFAULT_USER = "postgres.bjlmndmafrajjysenpbm"


@dataclass(frozen=True)
class Settings:
    host: str
    port: int
    database: str
    user: str
    password: str
    sslmode: str
    connect_timeout: int
    ingredient: str


def trim(value: str | None) -> str:
    return (value or "").strip()


def read_settings(args: argparse.Namespace) -> Settings:
    password = trim(args.db_password) or trim(os.environ.get("SUPABASE_DB_PASSWORD")) or trim(os.environ.get("PGPASSWORD"))
    if not password:
        raise SystemExit("Missing SUPABASE_DB_PASSWORD or PGPASSWORD. Audit is read-only and no database connection was opened.")

    return Settings(
        host=trim(args.db_host) or trim(os.environ.get("SUPABASE_DB_HOST")) or DEFAULT_HOST,
        port=int(trim(args.db_port) or trim(os.environ.get("SUPABASE_DB_PORT")) or "5432"),
        database=trim(args.db_name) or trim(os.environ.get("SUPABASE_DB_NAME")) or "postgres",
        user=trim(args.db_user) or trim(os.environ.get("SUPABASE_DB_USER")) or DEFAULT_USER,
        password=password,
        sslmode=trim(args.sslmode) or trim(os.environ.get("SUPABASE_DB_SSLMODE")) or "require",
        connect_timeout=int(trim(args.connect_timeout) or trim(os.environ.get("SUPABASE_DB_CONNECT_TIMEOUT")) or "15"),
        ingredient=trim(args.ingredient) or "Gà",
    )


def connect(settings: Settings):
    try:
        import psycopg
    except ImportError as exc:  # pragma: no cover - operator machine guard
        raise SystemExit("Missing dependency: psycopg. Install with `python -m pip install psycopg[binary]`.") from exc

    return psycopg.connect(
        host=settings.host,
        port=settings.port,
        dbname=settings.database,
        user=settings.user,
        password=settings.password,
        sslmode=settings.sslmode,
        connect_timeout=settings.connect_timeout,
    )


def fetch_one(cursor, sql: str, params: dict[str, object]) -> tuple:
    cursor.execute(sql, params)
    row = cursor.fetchone()
    return tuple(row) if row else tuple()


def fetch_all(cursor, sql: str, params: dict[str, object]) -> list[tuple]:
    cursor.execute(sql, params)
    return [tuple(row) for row in cursor.fetchall()]


def run_audit(settings: Settings) -> int:
    params = {
        "ingredient": settings.ingredient,
        "ingredient_like": f"%{settings.ingredient.lower()}%",
        "unsigned_like": "%ga%",
        "english_like": "%chicken%",
    }

    with connect(settings) as conn:
        with conn.cursor() as cursor:
            cursor.execute("set transaction read only")
            chicken_recipe_count = fetch_one(
                cursor,
                """
                select count(*)
                from public."Recipe" r
                join public."RecipeIngredient" ri on ri."RecipeId" = r."RecipeId"
                join public."FoodItem" f on f."FoodItemId" = ri."FoodItemId"
                where r."IsDeleted" = false
                  and f."IsActive" = true
                  and f."IsDeleted" = false
                  and (
                    lower(coalesce(f."FoodName", '')) like %(ingredient_like)s
                    or lower(coalesce(f."FoodNameUnsigned", '')) like %(unsigned_like)s
                    or lower(coalesce(f."FoodNameEn", '')) like %(english_like)s
                  )
                """,
                params,
            )[0]

            recipe_rows = fetch_all(
                cursor,
                """
                select
                    r."RecipeName",
                    r."ImageUrl",
                    r."InstructionsJson",
                    r."SourceUrlsJson",
                    r."VideoUrl",
                    r."EnhancedAt"
                from public."Recipe" r
                where r."IsDeleted" = false
                  and (
                    lower(r."RecipeName") like %(ingredient_like)s
                    or exists (
                        select 1
                        from public."RecipeIngredient" ri
                        join public."FoodItem" f on f."FoodItemId" = ri."FoodItemId"
                        where ri."RecipeId" = r."RecipeId"
                          and f."IsActive" = true
                          and f."IsDeleted" = false
                          and (
                            lower(coalesce(f."FoodName", '')) like %(ingredient_like)s
                            or lower(coalesce(f."FoodNameUnsigned", '')) like %(unsigned_like)s
                            or lower(coalesce(f."FoodNameEn", '')) like %(english_like)s
                          )
                    )
                  )
                order by r."RecipeName"
                limit 25
                """,
                params,
            )

    print("EatFitAI recipe suggestion read-only audit")
    print(f"  - host: {settings.host}:{settings.port}")
    print(f"  - database: {settings.database}")
    print(f"  - user: {settings.user}")
    print(f"  - ingredient: {settings.ingredient}")
    print(f"  - matching recipe ingredient rows: {chicken_recipe_count}")
    print("")
    print("Recipe readiness samples")
    if not recipe_rows:
        print("  - none")
        return 1

    has_ready_recipe = False
    for name, image_url, instructions_json, source_urls_json, video_url, enhanced_at in recipe_rows:
        has_image = bool(trim(image_url))
        has_steps = bool(trim(instructions_json))
        has_sources = bool(trim(source_urls_json))
        has_direct_video = "youtube.com/watch?v=" in trim(video_url) or "youtu.be/" in trim(video_url)
        has_search_video = "youtube.com/results" in trim(video_url)
        is_ready = has_image and has_steps and has_sources
        has_ready_recipe = has_ready_recipe or is_ready
        print(f"  - {name}: ready={is_ready} image={has_image} steps={has_steps} sources={has_sources} directVideo={has_direct_video} searchVideo={has_search_video} enhancedAt={enhanced_at is not None}")

    return 0 if has_ready_recipe else 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Audit production recipe suggestion readiness without writing data.")
    parser.add_argument("--ingredient", default="Gà", help="Ingredient display name to audit, default: Gà")
    parser.add_argument("--db-host", help="Supabase/Postgres host")
    parser.add_argument("--db-port", help="Supabase/Postgres port")
    parser.add_argument("--db-name", help="Database name")
    parser.add_argument("--db-user", help="Database user")
    parser.add_argument("--db-password", help="Database password")
    parser.add_argument("--sslmode", help="Postgres sslmode")
    parser.add_argument("--connect-timeout", help="Postgres connect timeout seconds")
    return parser


def main() -> int:
    settings = read_settings(build_parser().parse_args())
    return run_audit(settings)


if __name__ == "__main__":
    sys.exit(main())
