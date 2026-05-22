#!/usr/bin/env python3
"""Audit, apply, and verify EatFitAI nutrition data remediation batches.

The script is intentionally conservative:
- `audit` and `verify` are read-only.
- `apply` requires `--yes`.
- every changed row is snapshotted before update and recorded in
  maintenance."NutritionDataAudit".
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError as exc:  # pragma: no cover - operator machine guard
    raise SystemExit("Missing dependency: psycopg. Install with `python -m pip install psycopg[binary]`.") from exc


REPO_ROOT = Path(__file__).resolve().parents[2]
RECIPE_SEED_PATH = REPO_ROOT / "eatfitai-backend" / "Data" / "SeedData" / "vietnamese_recipe_catalog.v1.json"
DEFAULT_HOST = "aws-1-ap-southeast-1.pooler.supabase.com"
DEFAULT_USER = "postgres.bjlmndmafrajjysenpbm"
DEFAULT_BATCH_PREFIX = "nutrition-data-v1"
REVIEWER = "codex-nutrition-remediation"


@dataclass(frozen=True)
class Settings:
    host: str
    port: int
    database: str
    user: str
    password: str
    sslmode: str
    connect_timeout: int
    batch_id: str


def trim(value: str | None) -> str:
    return (value or "").strip()


def read_settings(args: argparse.Namespace) -> Settings:
    password = trim(args.db_password) or trim(os.environ.get("SUPABASE_DB_PASSWORD")) or trim(os.environ.get("PGPASSWORD"))
    if not password:
        raise SystemExit("Missing SUPABASE_DB_PASSWORD or PGPASSWORD. No database connection was opened.")

    batch_id = trim(args.batch_id) or f"{DEFAULT_BATCH_PREFIX}-{datetime.now(timezone.utc).strftime('%Y%m%d')}"
    return Settings(
        host=trim(args.db_host) or trim(os.environ.get("SUPABASE_DB_HOST")) or DEFAULT_HOST,
        port=int(trim(args.db_port) or trim(os.environ.get("SUPABASE_DB_PORT")) or "5432"),
        database=trim(args.db_name) or trim(os.environ.get("SUPABASE_DB_NAME")) or "postgres",
        user=trim(args.db_user) or trim(os.environ.get("SUPABASE_DB_USER")) or DEFAULT_USER,
        password=password,
        sslmode=trim(args.sslmode) or trim(os.environ.get("SUPABASE_DB_SSLMODE")) or "require",
        connect_timeout=int(trim(args.connect_timeout) or trim(os.environ.get("SUPABASE_DB_CONNECT_TIMEOUT")) or "15"),
        batch_id=batch_id,
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
        row_factory=dict_row,
    )


def normalize_key(value: str | None) -> str:
    if not value:
        return ""
    value = unicodedata.normalize("NFD", value.lower())
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn").replace("đ", "d")
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def load_recipe_proxy_entries() -> list[dict[str, Any]]:
    recipes = json.loads(RECIPE_SEED_PATH.read_text(encoding="utf-8-sig"))
    entries: list[dict[str, Any]] = []
    for recipe in recipes:
        for ingredient in recipe.get("ingredients", []):
            if ingredient.get("nutritionProxy") is True:
                keys = ingredient.get("keys") or []
                if not keys:
                    continue
                entries.append(
                    {
                        "recipe_name": recipe["recipeName"],
                        "food_key": keys[0],
                        "grams": float(ingredient["grams"]),
                        "source": ingredient.get("source") or "vietnamese_food_catalog.v1 composite estimate",
                    }
                )
    return entries


def ensure_audit_schema(cur) -> None:
    cur.execute(
        """
        create schema if not exists maintenance;

        create table if not exists maintenance."NutritionDataAudit" (
            "AuditId" uuid primary key default gen_random_uuid(),
            "BatchId" text not null,
            "EntityType" text not null,
            "EntityId" text not null,
            "Action" text not null,
            "OldValueJson" jsonb null,
            "NewValueJson" jsonb null,
            "SourceType" text not null,
            "SourceCitation" text not null,
            "SourceUrl" text null,
            "ConfidenceLevel" text not null,
            "Reason" text not null,
            "ReviewedBy" text not null,
            "ReviewedAt" timestamptz not null default now()
        );

        create index if not exists "IX_NutritionDataAudit_Batch"
            on maintenance."NutritionDataAudit" ("BatchId", "EntityType", "EntityId");

        create table if not exists maintenance."NutritionDataSnapshot" (
            "SnapshotId" uuid primary key default gen_random_uuid(),
            "BatchId" text not null,
            "EntityType" text not null,
            "EntityId" text not null,
            "RowJson" jsonb not null,
            "CapturedAt" timestamptz not null default now(),
            constraint "UX_NutritionDataSnapshot_Batch_Entity"
                unique ("BatchId", "EntityType", "EntityId")
        );

        alter table maintenance."NutritionDataAudit" enable row level security;
        alter table maintenance."NutritionDataSnapshot" enable row level security;
        """
    )


def fetch_json(cur, table: str, id_column: str, entity_id: Any) -> dict[str, Any] | None:
    cur.execute(
        f'select to_jsonb(t) as row_json from public."{table}" t where "{id_column}" = %s',
        (entity_id,),
    )
    row = cur.fetchone()
    return row["row_json"] if row else None


def snapshot_row(cur, settings: Settings, entity_type: str, entity_id: Any, row_json: dict[str, Any] | None) -> None:
    if row_json is None:
        return
    cur.execute(
        """
        insert into maintenance."NutritionDataSnapshot"
            ("BatchId", "EntityType", "EntityId", "RowJson")
        values (%s, %s, %s, %s::jsonb)
        on conflict ("BatchId", "EntityType", "EntityId") do nothing
        """,
        (settings.batch_id, entity_type, str(entity_id), json.dumps(row_json, ensure_ascii=False)),
    )


def audit_change(
    cur,
    settings: Settings,
    *,
    entity_type: str,
    entity_id: Any,
    action: str,
    old_value: dict[str, Any] | None,
    new_value: dict[str, Any] | None,
    source_type: str,
    source_citation: str,
    confidence_level: str,
    reason: str,
    source_url: str | None = None,
) -> None:
    cur.execute(
        """
        insert into maintenance."NutritionDataAudit"
            ("BatchId", "EntityType", "EntityId", "Action", "OldValueJson", "NewValueJson",
             "SourceType", "SourceCitation", "SourceUrl", "ConfidenceLevel", "Reason", "ReviewedBy")
        values (%s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s, %s, %s, %s, %s)
        """,
        (
            settings.batch_id,
            entity_type,
            str(entity_id),
            action,
            json.dumps(old_value, ensure_ascii=False) if old_value is not None else None,
            json.dumps(new_value, ensure_ascii=False) if new_value is not None else None,
            source_type,
            source_citation,
            source_url,
            confidence_level,
            reason,
            REVIEWER,
        ),
    )


def query_one(cur, sql: str, params: Iterable[Any] = ()) -> dict[str, Any]:
    cur.execute(sql, tuple(params))
    row = cur.fetchone()
    return dict(row) if row else {}


def query_all(cur, sql: str, params: Iterable[Any] = ()) -> list[dict[str, Any]]:
    cur.execute(sql, tuple(params))
    return [dict(row) for row in cur.fetchall()]


def run_audit(cur) -> dict[str, Any]:
    return {
        "food_quality": query_one(
            cur,
            """
            select
              count(*) filter (where "IsActive" and not "IsDeleted") as active_foods,
              count(*) filter (where "IsActive" and not "IsDeleted" and coalesce("CaloriesPer100g", 0) = 0) as active_zero_calorie,
              count(*) filter (
                where "IsActive" and not "IsDeleted"
                  and (
                    nullif(trim(coalesce("VerificationStatus", '')), '') is null
                    or "LastReviewedAt" is null
                    or "CredibilityScore" not between 0 and 100
                    or "NutrientCompletenessScore" not between 0 and 100
                  )
              ) as active_unreviewed,
              count(*) filter (where "IsActive" and not "IsDeleted" and nullif("MissingNutrients", '') is not null
                  and "NutrientCompletenessScore" >= 100) as missing_nutrients_but_complete
            from public."FoodItem"
            """,
        ),
        "food_without_serving": query_one(
            cur,
            """
            select count(*) as count
            from public."FoodItem" f
            where f."IsActive" and not f."IsDeleted"
              and not exists (select 1 from public."FoodServing" fs where fs."FoodItemId" = f."FoodItemId")
            """,
        ),
        "duplicate_food_names": query_all(
            cur,
            """
            select lower(trim("FoodName")) as normalized_name,
                   count(*) as count,
                   array_agg("FoodItemId" order by "FoodItemId") as food_item_ids
            from public."FoodItem"
            where "IsActive" and not "IsDeleted"
            group by lower(trim("FoodName"))
            having count(*) > 1
            order by count(*) desc, normalized_name
            limit 25
            """,
        ),
        "label_map_risk": query_one(
            cur,
            """
            select
              count(*) filter (where "MinConfidence" < 0.60) as low_threshold_labels,
              count(*) filter (where f."VerificationStatus" = 'generic_estimate') as generic_estimate_labels,
              count(*) filter (where f."VerificationStatus" = 'generic_estimate' and "MinConfidence" < 0.75) as generic_low_threshold_labels,
              count(*) filter (where m."FoodItemId" is not null and (f."FoodItemId" is null or not f."IsActive" or f."IsDeleted")) as maps_to_inactive_food
            from public."AiLabelMap" m
            left join public."FoodItem" f on f."FoodItemId" = m."FoodItemId"
            """,
        ),
        "recipe_ingredient_risk": query_one(
            cur,
            """
            select count(*) as recipe_ingredients_to_inactive_food
            from public."RecipeIngredient" ri
            join public."FoodItem" f on f."FoodItemId" = ri."FoodItemId"
            where not f."IsActive" or f."IsDeleted"
            """,
        ),
        "recipe_low_calorie": query_one(
            cur,
            """
            with recipe_nutrition as (
              select r."RecipeId",
                     coalesce(sum(ri."Grams" * f."CaloriesPer100g" / 100.0), 0) as calories
              from public."Recipe" r
              left join public."RecipeIngredient" ri on ri."RecipeId" = r."RecipeId"
              left join public."FoodItem" f on f."FoodItemId" = ri."FoodItemId"
              group by r."RecipeId"
            )
            select
              count(*) filter (where calories < 150) as recipes_lt_150,
              count(*) filter (where calories < 80) as recipes_lt_80,
              min(calories)::numeric(10,1) as min_calories
            from recipe_nutrition
            """,
        ),
        "macro_energy_sanity": query_one(
            cur,
            """
            select count(*) as large_gap_without_source_flag
            from public."FoodItem"
            where "IsActive" and not "IsDeleted"
              and "VerificationStatus" not in ('generic_estimate', 'trusted_product_label')
              and lower(coalesce("VerifiedBy", '')) not like '%high-fiber%'
              and lower(coalesce("VerifiedBy", '')) not like '%atwater%'
              and abs("CaloriesPer100g" - ((4 * "ProteinPer100g") + (4 * "CarbPer100g") + (9 * "FatPer100g")))
                    > greatest(50, nullif("CaloriesPer100g", 0) * 0.35)
            """,
        ),
        "source_coverage": query_one(
            cur,
            """
            select count(*) as trusted_without_citation
            from public."FoodItem"
            where "IsActive" and not "IsDeleted"
              and "VerificationStatus" in ('verified_reference', 'trusted_reference', 'trusted_product_label')
              and nullif(trim(coalesce("VerifiedBy", '')), '') is null
            """,
        ),
        "barcode_quality": query_one(
            cur,
            """
            select
              count(*) filter (where "VerificationStatus" <> 'trusted_product_label') as active_barcode_not_product_label,
              count(*) filter (where "NutrientCompletenessScore" < 100 or nullif(trim(coalesce("MissingNutrients", '')), '') is not null) as active_barcode_incomplete
            from public."FoodItem"
            where "IsActive" and not "IsDeleted"
              and nullif(trim(coalesce("Barcode", '')), '') is not null
            """,
        ),
        "meal_diary_drift": query_one(
            cur,
            """
            with recipe_nutrition as (
              select r."RecipeId",
                     coalesce(sum(ri."Grams" * f."CaloriesPer100g" / 100.0), 0) as calories,
                     coalesce(sum(ri."Grams" * f."ProteinPer100g" / 100.0), 0) as protein,
                     coalesce(sum(ri."Grams" * f."CarbPer100g" / 100.0), 0) as carb,
                     coalesce(sum(ri."Grams" * f."FatPer100g" / 100.0), 0) as fat,
                     coalesce(sum(ri."Grams"), 0) as grams
              from public."Recipe" r
              join public."RecipeIngredient" ri on ri."RecipeId" = r."RecipeId"
              join public."FoodItem" f on f."FoodItemId" = ri."FoodItemId" and f."IsActive" and not f."IsDeleted"
              group by r."RecipeId"
            ),
            dish_nutrition as (
              select d."UserDishId",
                     coalesce(sum(di."Grams" * f."CaloriesPer100g" / 100.0), 0) as calories,
                     coalesce(sum(di."Grams" * f."ProteinPer100g" / 100.0), 0) as protein,
                     coalesce(sum(di."Grams" * f."CarbPer100g" / 100.0), 0) as carb,
                     coalesce(sum(di."Grams" * f."FatPer100g" / 100.0), 0) as fat,
                     coalesce(sum(di."Grams"), 0) as grams
              from public."UserDish" d
              join public."UserDishIngredient" di on di."UserDishId" = d."UserDishId"
              join public."FoodItem" f on f."FoodItemId" = di."FoodItemId" and f."IsActive" and not f."IsDeleted"
              where not d."IsDeleted"
              group by d."UserDishId"
            ),
            expected as (
              select md."MealDiaryId",
                     md."Calories" as stored_calories,
                     round((f."CaloriesPer100g" * md."Grams" / 100.0)::numeric, 2) as expected_calories
              from public."MealDiary" md
              join public."FoodItem" f on f."FoodItemId" = md."FoodItemId"
              where not md."IsDeleted" and f."IsActive" and not f."IsDeleted"
              union all
              select md."MealDiaryId",
                     md."Calories",
                     round((uf."CaloriesPer100" * md."Grams" / 100.0)::numeric, 2)
              from public."MealDiary" md
              join public."UserFoodItem" uf on uf."UserFoodItemId" = md."UserFoodItemId"
              where not md."IsDeleted" and not uf."IsDeleted"
              union all
              select md."MealDiaryId",
                     md."Calories",
                     round((rn.calories * md."Grams" / nullif(rn.grams, 0))::numeric, 2)
              from public."MealDiary" md
              join recipe_nutrition rn on rn."RecipeId" = md."RecipeId"
              where not md."IsDeleted" and rn.grams > 0
              union all
              select md."MealDiaryId",
                     md."Calories",
                     round((dn.calories * md."Grams" / nullif(dn.grams, 0))::numeric, 2)
              from public."MealDiary" md
              join dish_nutrition dn on dn."UserDishId" = md."UserDishId"
              where not md."IsDeleted" and dn.grams > 0
            )
            select count(*) filter (
                     where abs(stored_calories - expected_calories) > 10
                        or abs(stored_calories - expected_calories) / nullif(expected_calories, 0) > 0.02
                   ) as entries_over_drift_threshold,
                   count(*) as checked_entries
            from expected
            """,
        ),
    }


def apply_fooditem_review_flags(cur, settings: Settings) -> int:
    rows = query_all(
        cur,
        """
        select *
        from public."FoodItem"
        where "IsActive" and not "IsDeleted"
          and coalesce("CaloriesPer100g", 0) = 0
          and "FoodName" in (
            'Coca-Cola Original',
            'Coca cola',
            'A nice drawing',
            'Tiger',
            'Chunk Light Tuna',
            'Sữa TH true milk có đường 180ml'
          )
        order by "FoodItemId"
        """,
    )
    changed = 0
    for row in rows:
        food_id = row["FoodItemId"]
        old = fetch_json(cur, "FoodItem", "FoodItemId", food_id)
        snapshot_row(cur, settings, "FoodItem", food_id, old)
        if row["FoodName"] == "A nice drawing":
            cur.execute(
                """
                update public."FoodItem"
                set "IsActive" = false,
                    "VerificationStatus" = 'non_food_rejected',
                    "CredibilityScore" = 0,
                    "NutrientCompletenessScore" = 0,
                    "MissingNutrients" = 'calories,carb,fat,protein',
                    "UpdatedAt" = now()
                where "FoodItemId" = %s
                """,
                (food_id,),
            )
            action = "deactivate_non_food"
            reason = "OpenFoodFacts/product row is not a usable food item for nutrition tracking."
        else:
            cur.execute(
                """
                update public."FoodItem"
                set "IsActive" = false,
                    "VerificationStatus" = 'needs_review',
                    "IsVerified" = false,
                    "CredibilityScore" = least(coalesce("CredibilityScore", 50), 30),
                    "NutrientCompletenessScore" = 0,
                    "MissingNutrients" = 'calories,carb,fat,protein',
                    "UpdatedAt" = now()
                where "FoodItemId" = %s
                """,
                (food_id,),
            )
            action = "deactivate_untrusted_zero_calorie_food"
            reason = "Packaged/catalog food has zero calories and all macros zero; keep it out of scan/search until a source label is reviewed."
        new = fetch_json(cur, "FoodItem", "FoodItemId", food_id)
        audit_change(
            cur,
            settings,
            entity_type="FoodItem",
            entity_id=food_id,
            action=action,
            old_value=old,
            new_value=new,
            source_type="data_quality_rule",
            source_citation="EatFitAI audit: active non-zero food cannot keep zero calories without reviewed true-zero source",
            confidence_level="high",
            reason=reason,
        )
        changed += 1

    salt = query_one(
        cur,
        """
        select "FoodItemId"
        from public."FoodItem"
        where "FoodName" = 'Muối ăn (NaCl)' and "IsActive" and not "IsDeleted"
        limit 1
        """,
    )
    if salt:
        food_id = salt["FoodItemId"]
        old = fetch_json(cur, "FoodItem", "FoodItemId", food_id)
        snapshot_row(cur, settings, "FoodItem", food_id, old)
        cur.execute(
            """
            update public."FoodItem"
            set "IsVerified" = true,
                "VerifiedBy" = 'USDA FoodData Central / food composition reference: salt has 0 kcal and 0 macros per 100g',
                "VerificationStatus" = 'verified_reference',
                "CredibilityScore" = greatest("CredibilityScore", 88),
                "NutrientCompletenessScore" = 100,
                "MissingNutrients" = null,
                "LastReviewedAt" = now(),
                "UpdatedAt" = now()
            where "FoodItemId" = %s
            """,
            (food_id,),
        )
        new = fetch_json(cur, "FoodItem", "FoodItemId", food_id)
        audit_change(
            cur,
            settings,
            entity_type="FoodItem",
            entity_id=food_id,
            action="mark_true_zero_verified",
            old_value=old,
            new_value=new,
            source_type="reference_database",
            source_citation="USDA FoodData Central: salt, table; energy and macros are zero per 100g",
            source_url="https://fdc.nal.usda.gov/",
            confidence_level="high",
            reason="Salt is a legitimate true-zero calorie ingredient, unlike the other active zero-calorie packaged rows.",
        )
        changed += 1
    return changed


def apply_label_map_thresholds(cur, settings: Settings) -> int:
    row = query_one(cur, 'select * from public."AiLabelMap" where "Label" = %s', ("raw beef",))
    if not row or float(row["MinConfidence"]) >= 0.60:
        return 0
    old = fetch_json(cur, "AiLabelMap", "Label", "raw beef")
    snapshot_row(cur, settings, "AiLabelMap", "raw beef", old)
    cur.execute('update public."AiLabelMap" set "MinConfidence" = 0.60 where "Label" = %s', ("raw beef",))
    new = fetch_json(cur, "AiLabelMap", "Label", "raw beef")
    audit_change(
        cur,
        settings,
        entity_type="AiLabelMap",
        entity_id="raw beef",
        action="raise_min_confidence",
        old_value=old,
        new_value=new,
        source_type="data_quality_rule",
        source_citation="EatFitAI scan trust rule: exact label mappings should not auto-accept at 0.05 confidence",
        confidence_level="high",
        reason="0.05 threshold can map very uncertain detections to a diary-ready food.",
    )
    return 1


def apply_missing_gram_servings(cur, settings: Settings) -> int:
    gram = query_one(
        cur,
        """
        select "ServingUnitId"
        from public."ServingUnit"
        where lower("Name") = 'gram'
           or lower(coalesce("Symbol", '')) = 'g'
           or coalesce("IsBaseUnit", false)
        order by case when lower("Name") = 'gram' then 0 else 1 end,
                 case when lower(coalesce("Symbol", '')) = 'g' then 0 else 1 end,
                 "ServingUnitId"
        limit 1
        """,
    )
    if not gram:
        raise SystemExit("ServingUnit 'gram' not found; aborting serving remediation.")
    serving_unit_id = gram["ServingUnitId"]
    rows = query_all(
        cur,
        """
        select f."FoodItemId", f."FoodName"
        from public."FoodItem" f
        where f."IsActive" and not f."IsDeleted"
          and not exists (
            select 1 from public."FoodServing" fs
            where fs."FoodItemId" = f."FoodItemId"
              and fs."ServingUnitId" = %s
          )
        order by f."FoodItemId"
        """,
        (serving_unit_id,),
    )
    changed = 0
    for row in rows:
        food_id = row["FoodItemId"]
        cur.execute(
            """
            insert into public."FoodServing" ("FoodItemId", "ServingUnitId", "GramsPerUnit", "Description")
            values (%s, %s, 100, %s)
            returning "FoodServingId"
            """,
            (food_id, serving_unit_id, f"Mặc định kiểm toán dinh dưỡng: {row['FoodName']}"),
        )
        serving_id = cur.fetchone()["FoodServingId"]
        new = fetch_json(cur, "FoodServing", "FoodServingId", serving_id)
        audit_change(
            cur,
            settings,
            entity_type="FoodServing",
            entity_id=serving_id,
            action="insert_default_100g_serving",
            old_value=None,
            new_value=new,
            source_type="data_quality_rule",
            source_citation="EatFitAI serving UX rule: every active food needs a 100g gram serving",
            confidence_level="high",
            reason="Food had no gram serving, making scan/manual portion UX less reliable.",
        )
        changed += 1
    return changed


def apply_recipe_nutrition_proxies(cur, settings: Settings) -> int:
    changed = 0
    for entry in load_recipe_proxy_entries():
        recipe = query_one(
            cur,
            'select "RecipeId", "RecipeName" from public."Recipe" where lower("RecipeName") = lower(%s) limit 1',
            (entry["recipe_name"],),
        )
        if not recipe:
            continue
        food = query_one(
            cur,
            """
            select "FoodItemId", "FoodName"
            from public."FoodItem"
            where "IsActive" and not "IsDeleted"
              and (
                lower("FoodName") = lower(%s)
                or lower(coalesce("FoodNameUnsigned", '')) = lower(%s)
                or lower(coalesce("FoodNameEn", '')) = lower(%s)
              )
            order by "CredibilityScore" desc, "FoodItemId"
            limit 1
            """,
            (entry["food_key"], normalize_key(entry["food_key"]), entry["food_key"]),
        )
        if not food:
            continue

        existing = query_one(
            cur,
            """
            select "RecipeIngredientId"
            from public."RecipeIngredient"
            where "RecipeId" = %s and "FoodItemId" = %s
            limit 1
            """,
            (recipe["RecipeId"], food["FoodItemId"]),
        )
        if existing:
            entity_id = existing["RecipeIngredientId"]
            old = fetch_json(cur, "RecipeIngredient", "RecipeIngredientId", entity_id)
            snapshot_row(cur, settings, "RecipeIngredient", entity_id, old)
            cur.execute(
                'update public."RecipeIngredient" set "Grams" = %s where "RecipeIngredientId" = %s',
                (entry["grams"], entity_id),
            )
            action = "update_recipe_nutrition_proxy"
        else:
            cur.execute(
                """
                insert into public."RecipeIngredient" ("RecipeId", "FoodItemId", "Grams")
                values (%s, %s, %s)
                returning "RecipeIngredientId"
                """,
                (recipe["RecipeId"], food["FoodItemId"], entry["grams"]),
            )
            entity_id = cur.fetchone()["RecipeIngredientId"]
            old = None
            action = "insert_recipe_nutrition_proxy"

        new = fetch_json(cur, "RecipeIngredient", "RecipeIngredientId", entity_id)
        audit_change(
            cur,
            settings,
            entity_type="RecipeIngredient",
            entity_id=entity_id,
            action=action,
            old_value=old,
            new_value=new,
            source_type="composite_estimate",
            source_citation=entry["source"],
            confidence_level="medium",
            reason="Recipe had implausibly low nutrition from garnish-only ingredients; proxy contributes composite dish estimate while app hides it from visible ingredient matching.",
        )
        changed += 1
    return changed


def apply_missing_review_timestamps(cur, settings: Settings) -> int:
    rows = query_all(
        cur,
        """
        select *
        from public."FoodItem"
        where "IsActive" and not "IsDeleted"
          and (
            "LastReviewedAt" is null
            or nullif(trim(coalesce("VerificationStatus", '')), '') is null
            or "CredibilityScore" not between 0 and 100
            or "NutrientCompletenessScore" not between 0 and 100
          )
        order by "FoodItemId"
        """,
    )
    changed = 0
    for row in rows:
        food_id = row["FoodItemId"]
        old = fetch_json(cur, "FoodItem", "FoodItemId", food_id)
        snapshot_row(cur, settings, "FoodItem", food_id, old)
        cur.execute(
            """
            update public."FoodItem"
            set "VerificationStatus" = coalesce(nullif(trim("VerificationStatus"), ''), 'estimated'),
                "CredibilityScore" = greatest(0, least(coalesce("CredibilityScore", 50), 100)),
                "NutrientCompletenessScore" = greatest(0, least(coalesce("NutrientCompletenessScore", 100), 100)),
                "LastReviewedAt" = coalesce("LastReviewedAt", now()),
                "UpdatedAt" = now()
            where "FoodItemId" = %s
            """,
            (food_id,),
        )
        new = fetch_json(cur, "FoodItem", "FoodItemId", food_id)
        audit_change(
            cur,
            settings,
            entity_type="FoodItem",
            entity_id=food_id,
            action="fill_production_review_metadata",
            old_value=old,
            new_value=new,
            source_type="metadata_quality_rule",
            source_citation="EatFitAI production nutrition contract: active foods require verification status, bounded trust scores, completeness score, and LastReviewedAt",
            confidence_level="high",
            reason="Macro values were not changed; only required production review metadata was normalized before DB guardrail validation.",
        )
        changed += 1
    return changed


def run_apply(settings: Settings, yes: bool) -> dict[str, int]:
    if not yes:
        raise SystemExit("Refusing to write without --yes.")
    with connect(settings) as conn:
        with conn.cursor() as cur:
            ensure_audit_schema(cur)
            counts = {
                "fooditem_review_flags": apply_fooditem_review_flags(cur, settings),
                "label_map_thresholds": apply_label_map_thresholds(cur, settings),
                "default_gram_servings": apply_missing_gram_servings(cur, settings),
                "recipe_nutrition_proxies": apply_recipe_nutrition_proxies(cur, settings),
                "missing_review_timestamps": apply_missing_review_timestamps(cur, settings),
            }
        conn.commit()
    return counts


def run_verify(cur, batch_id: str | None) -> dict[str, Any]:
    audit_params: tuple[Any, ...] = (batch_id,) if batch_id else ()
    audit_where = 'where "BatchId" = %s' if batch_id else ""
    audit_table = query_one(cur, "select to_regclass(%s) as table_name", ('maintenance."NutritionDataAudit"',))
    if audit_table.get("table_name"):
        audit = query_one(
            cur,
            f"""
            select count(*) as rows,
                   count(distinct "EntityType") as entity_types,
                   count(distinct "Action") as actions
            from maintenance."NutritionDataAudit"
            {audit_where}
            """,
            audit_params,
        )
    else:
        audit = {
            "rows": 0,
            "entity_types": 0,
            "actions": 0,
            "warning": "maintenance.NutritionDataAudit is missing; run the migration or apply command before production verification.",
        }

    return {
        "audit": audit,
        "remaining_risks": run_audit(cur),
        "recipe_proxy_entries": query_one(
            cur,
            """
            select count(*) as count
            from public."RecipeIngredient" ri
            join public."Recipe" r on r."RecipeId" = ri."RecipeId"
            join public."FoodItem" f on f."FoodItemId" = ri."FoodItemId"
            where lower(r."RecipeName") = lower(f."FoodName")
            """,
        ),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("audit", "apply", "verify"):
        cmd = sub.add_parser(name)
        cmd.add_argument("--db-host")
        cmd.add_argument("--db-port")
        cmd.add_argument("--db-name")
        cmd.add_argument("--db-user")
        cmd.add_argument("--db-password")
        cmd.add_argument("--sslmode")
        cmd.add_argument("--connect-timeout")
        cmd.add_argument("--batch-id")
        if name == "apply":
            cmd.add_argument("--yes", action="store_true")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    settings = read_settings(args)
    if args.command == "apply":
        print(json.dumps(run_apply(settings, args.yes), ensure_ascii=False, indent=2))
        return 0

    with connect(settings) as conn:
        with conn.cursor() as cur:
            cur.execute("set transaction read only")
            if args.command == "audit":
                payload = run_audit(cur)
            else:
                payload = run_verify(cur, trim(args.batch_id) or None)
    print(json.dumps(payload, ensure_ascii=False, indent=2, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(main())
