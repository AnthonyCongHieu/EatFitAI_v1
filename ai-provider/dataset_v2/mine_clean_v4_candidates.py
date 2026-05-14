from __future__ import annotations

import argparse
import copy
import json
from collections import defaultdict
from pathlib import Path
from typing import Any

from common import dump_yaml, load_yaml, read_csv, write_csv, write_json
from mine_clean_v3_candidates import (
    existing_canonical_for,
    int_value,
    normalize_candidate_name,
    taxonomy_alias_map,
    taxonomy_classes,
    taxonomy_reject_aliases,
)


DEFAULT_POLICY: dict[str, Any] = {
    "target_class_count": {
        "minimum_to_spend_gpu": 300,
        "max_ceiling_goal": 340,
        "upper_without_manual_review": 360,
        "hard_stop_above": 420,
    },
    "new_class_gates": {
        "detection_or_segmentation_source": {
            "hold_images": 150,
            "accept_images": 350,
            "accept_instances": 500,
            "priority_accept_images": 800,
        },
        "classification_pseudo_box_source": {
            "hold_images": 300,
            "accept_images": 700,
            "priority_accept_images": 1200,
        },
    },
    "source_gates": {
        "reject_unknown_license_for_default_training": True,
    },
    "class_design": {
        "hold_generic_labels": {
            "food",
            "dish",
            "meal",
            "mon_an",
            "thit",
            "rau",
            "label",
            "person",
            "protein",
            "karbohidrat",
            "sayur",
            "buah",
            "minuman",
        },
        "manual_mapping_labels": {
            "water",
            "coffee",
            "coffee_with_caffeine",
            "espresso_with_caffeine",
            "white_coffee_with_caffeine",
            "tea",
            "wine",
            "wine_red",
            "wine_white",
            "juice",
            "milk",
            "milkshake",
            "sauce",
            "tomato_sauce",
            "honey",
            "jam",
            "butter",
            "parmesan",
            "cheese_butter",
            "hard_cheese",
        },
        "manual_mapping_terms": {
            "sauce",
            "coffee",
            "wine",
        },
        "canonical_label_remaps": {
            "tomato_raw": "tomato",
            "carrot_raw": "carrot",
            "bell_pepper_red_raw": "bell_pepper",
            "strawberries": "strawberry",
            "bread_wholemeal": "bread_whole_wheat",
            "pasta_spaghetti": "pasta",
            "orange_orange_fruit": "orange",
            "cucumber_cuke": "cucumber",
            "bell_pepper_capsicum": "bell_pepper",
        },
        "targeted_collection_fit_lanes": {
            "VIETNAMESE_DISH_EXPANSION",
        },
        "targeted_collection_min_images": 180,
    },
}


BLOCKED_SOURCE_DECISION_PREFIXES = ("HOLD", "REJECT", "SKIP")
PRIVATE_LICENSE_MARKERS = ("nc", "noncommercial", "private_only")
BAD_LICENSE_MARKERS = ("unknown", "copyright-authors", "copyright")


def load_policy(path: Path | None) -> dict[str, Any]:
    policy = copy.deepcopy(DEFAULT_POLICY)
    if path is None:
        return policy
    raw = load_yaml(path)
    for key, value in raw.items():
        if isinstance(value, dict) and isinstance(policy.get(key), dict):
            policy[key].update(value)
        else:
            policy[key] = value
    default_hold_labels = set(DEFAULT_POLICY["class_design"]["hold_generic_labels"])
    hold_labels = policy.get("class_design", {}).get("hold_generic_labels", set())
    if isinstance(hold_labels, list):
        policy["class_design"]["hold_generic_labels"] = default_hold_labels | {
            normalize_candidate_name(str(label)) for label in hold_labels
        }
    elif isinstance(hold_labels, set):
        policy["class_design"]["hold_generic_labels"] = default_hold_labels | hold_labels
    default_manual_labels = set(DEFAULT_POLICY["class_design"]["manual_mapping_labels"])
    manual_labels = policy.get("class_design", {}).get("manual_mapping_labels", set())
    if isinstance(manual_labels, list):
        policy["class_design"]["manual_mapping_labels"] = default_manual_labels | {
            normalize_candidate_name(str(label)) for label in manual_labels
        }
    elif isinstance(manual_labels, set):
        policy["class_design"]["manual_mapping_labels"] = default_manual_labels | manual_labels
    default_manual_terms = set(DEFAULT_POLICY["class_design"]["manual_mapping_terms"])
    manual_terms = policy.get("class_design", {}).get("manual_mapping_terms", set())
    if isinstance(manual_terms, list):
        policy["class_design"]["manual_mapping_terms"] = default_manual_terms | {
            normalize_candidate_name(str(term)) for term in manual_terms
        }
    elif isinstance(manual_terms, set):
        policy["class_design"]["manual_mapping_terms"] = default_manual_terms | manual_terms
    default_remaps = dict(DEFAULT_POLICY["class_design"]["canonical_label_remaps"])
    remaps = policy.get("class_design", {}).get("canonical_label_remaps", {})
    if isinstance(remaps, dict):
        policy["class_design"]["canonical_label_remaps"] = {
            normalize_candidate_name(str(key)): normalize_candidate_name(str(value))
            for key, value in {**default_remaps, **remaps}.items()
        }
    default_lanes = set(DEFAULT_POLICY["class_design"]["targeted_collection_fit_lanes"])
    lanes = policy.get("class_design", {}).get("targeted_collection_fit_lanes", set())
    if isinstance(lanes, list):
        policy["class_design"]["targeted_collection_fit_lanes"] = default_lanes | {str(lane).strip() for lane in lanes}
    elif isinstance(lanes, set):
        policy["class_design"]["targeted_collection_fit_lanes"] = default_lanes | lanes
    return policy


def source_key(row: dict[str, str]) -> str:
    return (row.get("dataset_ref") or row.get("source_ref") or row.get("source_slug") or "").strip()


def source_index(source_rows: list[dict[str, str]]) -> dict[str, dict[str, str]]:
    index: dict[str, dict[str, str]] = {}
    slug_counts: defaultdict[str, int] = defaultdict(int)
    for row in source_rows:
        slug = row.get("source_slug", "").strip()
        if slug:
            slug_counts[slug] += 1
    for row in source_rows:
        key = source_key(row)
        if key:
            index[key] = row
    for row in source_rows:
        slug = row.get("source_slug", "").strip()
        if slug and slug_counts[slug] == 1:
            index.setdefault(slug, row)
    return index


def source_hold_reason(source: dict[str, str] | None, include_private: bool = False) -> str:
    if source is None:
        return "source_audit_missing"
    status = source.get("status", "").strip().lower()
    if status != "audited":
        return f"source_not_audited:{status or 'unknown'}"
    decision = source.get("decision", "").strip().upper()
    if decision.startswith(BLOCKED_SOURCE_DECISION_PREFIXES):
        return f"source_decision:{decision}"
    license_value = source.get("license", "").strip().lower()
    if any(marker in license_value for marker in BAD_LICENSE_MARKERS):
        return f"license_blocked:{license_value or 'missing'}"
    if not include_private and any(marker in license_value for marker in PRIVATE_LICENSE_MARKERS):
        return f"private_or_noncommercial_license:{license_value}"
    if not include_private and "PRIVATE_ONLY" in decision:
        return f"private_source_decision:{decision}"
    return ""


def row_origin(row: dict[str, str]) -> str:
    origin = (row.get("candidate_origin") or row.get("source_format") or "").strip()
    if "classification" in origin:
        return "classification_pseudo_box_review"
    if "segmentation" in origin or "mask" in origin:
        return "segmentation_or_mask"
    return origin or "unknown"


def canonical_candidate_name(candidate_name: str, policy: dict[str, Any]) -> str:
    remaps = policy.get("class_design", {}).get("canonical_label_remaps", {})
    if isinstance(remaps, dict):
        return str(remaps.get(candidate_name, candidate_name))
    return candidate_name


def origin_family(origin: str) -> str:
    if "classification" in origin:
        return "classification_pseudo_box_source"
    return "detection_or_segmentation_source"


def aggregate_candidates(
    rows: list[dict[str, str]],
    source_rows: list[dict[str, str]],
    policy: dict[str, Any],
    include_private: bool = False,
) -> list[dict[str, Any]]:
    sources = source_index(source_rows)
    grouped: dict[str, dict[str, Any]] = {}
    for row in rows:
        raw_name = (row.get("raw_class_name") or row.get("normalized_class_name") or "").strip()
        candidate_name = canonical_candidate_name(
            normalize_candidate_name(raw_name or row.get("normalized_class_name") or ""),
            policy,
        )
        if not candidate_name:
            continue
        group = grouped.setdefault(
            candidate_name,
            {
                "candidate_name": candidate_name,
                "raw_labels": set(),
                "sources": set(),
                "eligible_sources": set(),
                "hold_reasons": set(),
                "targeted_collection_lanes": set(),
                "images": 0,
                "instances": 0,
                "eligible_images": 0,
                "eligible_instances": 0,
                "origin_images": defaultdict(int),
            },
        )
        if raw_name:
            group["raw_labels"].add(raw_name)
        row_source_key = source_key(row)
        if row_source_key:
            group["sources"].add(row_source_key)
        images = int_value(row.get("images"))
        instances = int_value(row.get("instances"))
        group["images"] += images
        group["instances"] += instances
        origin = row_origin(row)
        group["origin_images"][origin] += images
        source = sources.get(row_source_key)
        hold_reason = source_hold_reason(source, include_private=include_private)
        if hold_reason:
            group["hold_reasons"].add(hold_reason)
            continue
        source = source or {}
        fit_lane = source.get("fit_lane", "").strip()
        targeted_lanes = policy.get("class_design", {}).get("targeted_collection_fit_lanes", set())
        if fit_lane and fit_lane in targeted_lanes:
            group["targeted_collection_lanes"].add(fit_lane)
        if row_source_key:
            group["eligible_sources"].add(row_source_key)
        group["eligible_images"] += images
        group["eligible_instances"] += instances
    return list(grouped.values())


def dominant_origin(origin_images: dict[str, int]) -> str:
    if not origin_images:
        return "unknown"
    return sorted(origin_images.items(), key=lambda item: (-item[1], item[0]))[0][0]


def is_generic_label(candidate_name: str, policy: dict[str, Any]) -> bool:
    hold_labels = policy.get("class_design", {}).get("hold_generic_labels", set())
    return candidate_name in hold_labels


def is_numeric_or_placeholder_label(candidate_name: str) -> bool:
    return candidate_name.isdigit() or len(candidate_name) <= 1


def needs_manual_mapping(candidate_name: str, policy: dict[str, Any]) -> bool:
    class_design = policy.get("class_design", {})
    manual_labels = class_design.get("manual_mapping_labels", set())
    manual_terms = class_design.get("manual_mapping_terms", set())
    return candidate_name in manual_labels or any(term in candidate_name for term in manual_terms)


def decision_for(
    candidate_name: str,
    eligible_images: int,
    eligible_instances: int,
    eligible_source_count: int,
    origin: str,
    existing_canonical_class: str,
    base_reject_alias: bool,
    targeted_collection_candidate: bool,
    policy: dict[str, Any],
) -> tuple[str, str, bool]:
    if existing_canonical_class:
        return "existing", "base_taxonomy_class", False
    if base_reject_alias:
        return "reject", "base_reject_alias", False
    if is_numeric_or_placeholder_label(candidate_name):
        return "reject", "numeric_or_placeholder_label", False
    if is_generic_label(candidate_name, policy):
        return "hold_generic_label", "generic_or_bucket_label", False
    if needs_manual_mapping(candidate_name, policy):
        return "hold_manual_mapping", "better_as_nutrition_mapping_than_detector_class", False
    if eligible_source_count == 0:
        return "hold_private_or_license", "no_default_training_source", False

    gates = policy["new_class_gates"][origin_family(origin)]
    if origin_family(origin) == "classification_pseudo_box_source":
        if eligible_images >= int(gates["priority_accept_images"]):
            return "priority_accept", "classification_priority_images", True
        if eligible_images >= int(gates["accept_images"]):
            return "accept", "classification_accept_images", True
        if eligible_images >= int(gates["hold_images"]):
            return "hold_more_data", "classification_below_accept_threshold", False
    else:
        if eligible_images >= int(gates["priority_accept_images"]):
            return "priority_accept", "detection_priority_images", True
        if eligible_images >= int(gates["accept_images"]) or eligible_instances >= int(gates["accept_instances"]):
            return "accept", "detection_accept_images_or_instances", True
        if eligible_images >= int(gates["hold_images"]):
            return "hold_more_data", "detection_below_accept_threshold", False
    if targeted_collection_candidate and eligible_images >= int(
        policy.get("class_design", {}).get("targeted_collection_min_images", 180)
    ):
        return "hold_targeted_collection", "vietnamese_permissive_source_needs_more_data", False
    return "reject", "too_few_eligible_images", False


def score_candidates(
    rows: list[dict[str, str]],
    source_rows: list[dict[str, str]],
    base_taxonomy: dict[str, Any],
    policy: dict[str, Any],
    include_private: bool = False,
) -> list[dict[str, Any]]:
    alias_map = taxonomy_alias_map(base_taxonomy)
    reject_aliases = taxonomy_reject_aliases(base_taxonomy)
    scorecard: list[dict[str, Any]] = []
    for candidate in aggregate_candidates(rows, source_rows, policy=policy, include_private=include_private):
        candidate_name = candidate["candidate_name"]
        raw_labels = sorted(candidate["raw_labels"])
        existing_canonical = existing_canonical_for(candidate_name, raw_labels, alias_map)
        base_reject_alias = candidate_name in reject_aliases or any(
            normalize_candidate_name(label) in reject_aliases for label in raw_labels
        )
        origin = dominant_origin(dict(candidate["origin_images"]))
        decision, reason, append = decision_for(
            candidate_name,
            int(candidate["eligible_images"]),
            int(candidate["eligible_instances"]),
            len(candidate["eligible_sources"]),
            origin,
            existing_canonical,
            base_reject_alias,
            bool(candidate["targeted_collection_lanes"]),
            policy,
        )
        scorecard.append(
            {
                "candidate_name": candidate_name,
                "decision": decision,
                "append_to_taxonomy": append,
                "existing_canonical_class": existing_canonical,
                "images": int(candidate["images"]),
                "instances": int(candidate["instances"]),
                "eligible_images": int(candidate["eligible_images"]),
                "eligible_instances": int(candidate["eligible_instances"]),
                "source_count": len(candidate["sources"]),
                "eligible_source_count": len(candidate["eligible_sources"]),
                "sources": "|".join(sorted(candidate["sources"])),
                "eligible_sources": "|".join(sorted(candidate["eligible_sources"])),
                "raw_labels": "|".join(raw_labels),
                "dominant_candidate_origin": origin,
                "hold_reasons": "|".join(sorted(candidate["hold_reasons"])),
                "targeted_collection_lanes": "|".join(sorted(candidate["targeted_collection_lanes"])),
                "decision_reason": reason,
            }
        )
    priority = {
        "priority_accept": 0,
        "accept": 1,
        "existing": 2,
        "hold_more_data": 3,
        "hold_generic_label": 4,
        "hold_manual_mapping": 5,
        "hold_targeted_collection": 6,
        "hold_private_or_license": 7,
        "reject": 8,
    }
    return sorted(
        scorecard,
        key=lambda row: (
            priority.get(str(row["decision"]), 99),
            -int(row["eligible_images"]),
            -int(row["images"]),
            str(row["candidate_name"]),
        ),
    )


def build_expanded_taxonomy(
    base_taxonomy: dict[str, Any],
    scorecard: list[dict[str, Any]],
    source_policy: str,
) -> dict[str, Any]:
    classes = taxonomy_classes(base_taxonomy)
    existing = set(classes)
    aliases = dict(base_taxonomy.get("aliases", {}) or {})
    for row in scorecard:
        candidate_name = str(row["candidate_name"])
        if not row.get("append_to_taxonomy") or candidate_name in existing:
            continue
        classes.append(candidate_name)
        existing.add(candidate_name)
        raw_labels = [label for label in str(row.get("raw_labels", "")).split("|") if label]
        aliases[candidate_name] = raw_labels or [candidate_name]
    expanded = dict(base_taxonomy)
    expanded["version"] = "2026-05-13-clean-v4-expanded"
    expanded["source_policy"] = source_policy
    expanded["classes"] = classes
    expanded["aliases"] = aliases
    return expanded


def summarize_scorecard(scorecard: list[dict[str, Any]], base_class_count: int, policy: dict[str, Any]) -> dict[str, Any]:
    counts: defaultdict[str, int] = defaultdict(int)
    accepted = []
    for row in scorecard:
        counts[str(row["decision"])] += 1
        if row.get("append_to_taxonomy"):
            accepted.append(str(row["candidate_name"]))
    final_count = base_class_count + len(accepted)
    target = policy["target_class_count"]
    if final_count < int(target["minimum_to_spend_gpu"]):
        status = "collect_more_v4_classes_before_gpu"
    elif final_count > int(target["hard_stop_above"]):
        status = "manual_taxonomy_review_required"
    elif final_count > int(target["upper_without_manual_review"]):
        status = "review_taxonomy_before_gpu"
    else:
        status = "ready_for_clean_build_v4"
    return {
        "base_class_count": base_class_count,
        "accepted_new_classes": len(accepted),
        "final_class_count_if_applied": final_count,
        "decision_counts": dict(sorted(counts.items())),
        "accepted_new_class_names": accepted,
        "target_minimum_to_spend_gpu": int(target["minimum_to_spend_gpu"]),
        "target_aim_class_count": int(target["max_ceiling_goal"]),
        "status": status,
    }


def build_source_policy_rows(source_rows: list[dict[str, str]], scorecard: list[dict[str, Any]]) -> list[dict[str, Any]]:
    accepted_sources: set[str] = set()
    for row in scorecard:
        if not row.get("append_to_taxonomy"):
            continue
        accepted_sources.update(source for source in str(row.get("eligible_sources", "")).split("|") if source)
    output = []
    for source in source_rows:
        slug = source.get("source_slug", "").strip()
        if not slug:
            continue
        key = source_key(source)
        output.append(
            {
                "source_slug": slug,
                "source_ref": key,
                "dataset_ref": source.get("dataset_ref", ""),
                "source_format": source.get("source_format", ""),
                "audit_mode": source.get("audit_mode", ""),
                "audit_state": source.get("status", ""),
                "clean_lane": source.get("fit_lane", ""),
                "include_in_default_clean": "yes" if key in accepted_sources or slug in accepted_sources else "no",
                "license_lane": source.get("license", ""),
                "cache_state": "kaggle_v4_source_audit",
                "source_weight_cap": "0.60" if key in accepted_sources or slug in accepted_sources else "0.00",
                "required_filters": source.get("next_gate", ""),
                "reason": source.get("decision", ""),
            }
        )
    return output


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Mine and gate YOLO11 Clean V4 candidate classes from V4 source audit.")
    parser.add_argument("--class-candidates", type=Path, required=True)
    parser.add_argument("--source-audit", type=Path, required=True)
    parser.add_argument("--base-taxonomy", type=Path, required=True)
    parser.add_argument("--policy", type=Path, default=None)
    parser.add_argument("--scorecard-out", type=Path, required=True)
    parser.add_argument("--summary-out", type=Path, required=True)
    parser.add_argument("--expanded-taxonomy-out", type=Path, default=None)
    parser.add_argument("--source-policy-out", type=Path, default=None)
    parser.add_argument("--write-taxonomy", action="store_true")
    parser.add_argument("--include-private", action="store_true")
    args = parser.parse_args(argv)

    candidate_rows = read_csv(args.class_candidates)
    source_rows = read_csv(args.source_audit)
    base_taxonomy = load_yaml(args.base_taxonomy)
    policy = load_policy(args.policy)
    base_classes = taxonomy_classes(base_taxonomy)
    scorecard = score_candidates(
        candidate_rows,
        source_rows=source_rows,
        base_taxonomy=base_taxonomy,
        policy=policy,
        include_private=args.include_private,
    )
    summary = summarize_scorecard(scorecard, len(base_classes), policy)
    write_csv(args.scorecard_out, scorecard)
    write_json(args.summary_out, summary)
    if args.source_policy_out is not None:
        write_csv(args.source_policy_out, build_source_policy_rows(source_rows, scorecard))
    if args.write_taxonomy:
        if args.expanded_taxonomy_out is None:
            parser.error("--expanded-taxonomy-out is required with --write-taxonomy")
        dump_yaml(
            args.expanded_taxonomy_out,
            build_expanded_taxonomy(
                base_taxonomy,
                scorecard,
                source_policy=args.source_policy_out.name if args.source_policy_out else "",
            ),
        )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
