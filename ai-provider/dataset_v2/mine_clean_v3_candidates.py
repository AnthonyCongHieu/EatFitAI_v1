from __future__ import annotations

import argparse
import csv
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any

from common import dump_yaml, load_yaml, read_csv, write_csv, write_json


DEFAULT_POLICY: dict[str, Any] = {
    "min_hold_images": 80,
    "min_accept_images": 500,
    "priority_accept_images": 800,
    "preferred_source_count": 2,
    "max_classes_without_manual_review": 260,
    "blocked_exact_labels": {
        "",
        "'",
        "-",
        "label",
        "labels",
        "con_nguoi",
        "human",
        "person",
        "people",
        "hamburger",
    },
    "blocked_terms": {
        "person",
        "human",
        "people",
        "package",
        "packaged",
        "wrapper",
    },
    "high_value_terms": {
        "banh",
        "bun",
        "canh",
        "ca",
        "chao",
        "com",
        "dau_hu",
        "ga",
        "goi",
        "heo",
        "hu_tieu",
        "kho",
        "lau",
        "mi",
        "nuong",
        "pho",
        "rang",
        "thit",
        "trung",
        "xao",
    },
    "preparation_terms": {
        "boiled",
        "braised",
        "chien",
        "fried",
        "grilled",
        "kho",
        "luoc",
        "nuong",
        "roast",
        "roasted",
        "xao",
    },
}


PARENT_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("chicken", ("chicken", "ga_")),
    ("beef", ("beef", "bo_")),
    ("pork", ("pork", "heo", "thit_heo", "ba_roi")),
    ("fish", ("fish", "ca_")),
    ("egg", ("egg", "trung")),
    ("tofu", ("tofu", "dau_hu")),
    ("cheese", ("cheese", "pho_mai")),
    ("rice", ("rice", "com", "xoi")),
    ("noodles", ("noodle", "bun", "mi_", "hu_tieu", "pho")),
    ("soup", ("canh", "soup")),
)


SOURCE_PREFIX_RE = re.compile(r"^y[a-z]_(?=[a-z0-9_]+)")
TRAILING_PARENTHETICAL_RE = re.compile(r"\s*\([^)]*\)\s*$")


def strip_parenthetical_translation(value: str) -> str:
    text = value.strip()
    while True:
        stripped = TRAILING_PARENTHETICAL_RE.sub("", text).strip()
        if not stripped or stripped == text:
            return text
        text = stripped


def normalize_candidate_name(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", strip_parenthetical_translation(value))
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    ascii_text = ascii_text.lower()
    ascii_text = re.sub(r"[^a-z0-9]+", "_", ascii_text)
    ascii_text = re.sub(r"_+", "_", ascii_text).strip("_")
    ascii_text = SOURCE_PREFIX_RE.sub("", ascii_text)
    return ascii_text


def int_value(value: object) -> int:
    try:
        return int(float(str(value or "0").strip()))
    except ValueError:
        return 0


def taxonomy_classes(taxonomy: dict[str, Any]) -> list[str]:
    classes = taxonomy.get("classes", [])
    if isinstance(classes, dict):
        return [str(classes[key]) for key in sorted(classes)]
    return [str(item) for item in classes]


def taxonomy_alias_map(taxonomy: dict[str, Any]) -> dict[str, str]:
    aliases: dict[str, str] = {}
    classes = taxonomy_classes(taxonomy)
    for canonical in classes:
        aliases[normalize_candidate_name(canonical)] = canonical
    raw_aliases = taxonomy.get("aliases", {}) or {}
    if isinstance(raw_aliases, dict):
        for canonical, values in raw_aliases.items():
            if canonical not in classes:
                continue
            aliases[normalize_candidate_name(str(canonical))] = str(canonical)
            if isinstance(values, list):
                for value in values:
                    aliases[normalize_candidate_name(str(value))] = str(canonical)
    return aliases


def taxonomy_reject_aliases(taxonomy: dict[str, Any]) -> set[str]:
    values = taxonomy.get("reject_aliases", []) or []
    if not isinstance(values, list):
        return set()
    return {normalize_candidate_name(str(value)) for value in values}


def load_base_classes(path: Path) -> list[str]:
    return taxonomy_classes(load_yaml(path))


def load_policy(path: Path | None) -> dict[str, Any]:
    policy = dict(DEFAULT_POLICY)
    if path is None:
        return policy
    raw = load_yaml(path)
    for key, value in raw.items():
        if isinstance(value, list):
            policy[key] = set(str(item) for item in value)
        else:
            policy[key] = value
    return policy


def is_blocked(candidate_name: str, policy: dict[str, Any]) -> bool:
    if candidate_name in policy["blocked_exact_labels"]:
        return True
    return any(term in candidate_name for term in policy["blocked_terms"])


def is_high_value(candidate_name: str, policy: dict[str, Any]) -> bool:
    return any(term in candidate_name for term in policy["high_value_terms"])


def is_preparation_specific(candidate_name: str, policy: dict[str, Any]) -> bool:
    return any(term in candidate_name for term in policy["preparation_terms"])


def parent_class_for(candidate_name: str, base_classes: set[str]) -> str:
    for parent, patterns in PARENT_RULES:
        if parent not in base_classes:
            continue
        if any(pattern in candidate_name for pattern in patterns):
            return parent
    return ""


def aggregate_candidates(rows: list[dict[str, str]]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for row in rows:
        raw_name = (row.get("raw_class_name") or row.get("normalized_class_name") or "").strip()
        candidate_name = normalize_candidate_name(raw_name or row.get("normalized_class_name") or "")
        if candidate_name not in grouped:
            grouped[candidate_name] = {
                "candidate_name": candidate_name,
                "raw_labels": set(),
                "sources": set(),
                "images": 0,
                "instances": 0,
            }
        group = grouped[candidate_name]
        if raw_name:
            group["raw_labels"].add(raw_name)
        source_slug = row.get("source_slug", "").strip()
        if source_slug:
            group["sources"].add(source_slug)
        group["images"] += int_value(row.get("images"))
        group["instances"] += int_value(row.get("instances"))
    return list(grouped.values())


def existing_canonical_for(candidate_name: str, raw_labels: list[str], alias_map: dict[str, str]) -> str:
    if candidate_name in alias_map:
        return alias_map[candidate_name]
    for label in raw_labels:
        normalized = normalize_candidate_name(label)
        if normalized in alias_map:
            return alias_map[normalized]
    return ""


def decision_for(
    candidate_name: str,
    images: int,
    source_count: int,
    existing_canonical_class: str,
    base_reject_alias: bool,
    policy: dict[str, Any],
) -> tuple[str, str, bool]:
    if existing_canonical_class:
        return "existing", "base_taxonomy_class", False
    if base_reject_alias:
        return "reject", "base_reject_alias", False
    if is_blocked(candidate_name, policy):
        return "reject", "blocked_label", False

    high_value = is_high_value(candidate_name, policy) or is_preparation_specific(candidate_name, policy)
    if images >= int(policy["priority_accept_images"]) and (
        source_count >= int(policy["preferred_source_count"]) or high_value
    ):
        return "priority_accept", "priority_images_and_relevance", True
    if images >= int(policy["min_accept_images"]) and (
        source_count >= int(policy["preferred_source_count"]) or high_value
    ):
        return "accept", "enough_images_and_relevance", True
    if high_value or images >= int(policy["min_hold_images"]):
        return "hold_more_data", "below_accept_threshold", False
    return "reject", "too_few_images", False


def score_candidates(
    rows: list[dict[str, str]],
    policy: dict[str, Any],
    base_classes: list[str] | None = None,
    base_taxonomy: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    if base_taxonomy is None:
        base_taxonomy = {"classes": base_classes or []}
    if base_classes is None:
        base_classes = taxonomy_classes(base_taxonomy)
    base_class_set = set(base_classes)
    alias_map = taxonomy_alias_map(base_taxonomy)
    reject_aliases = taxonomy_reject_aliases(base_taxonomy)
    scorecard: list[dict[str, Any]] = []
    for candidate in aggregate_candidates(rows):
        candidate_name = candidate["candidate_name"]
        sources = sorted(candidate["sources"])
        raw_labels = sorted(candidate["raw_labels"])
        existing_canonical = existing_canonical_for(candidate_name, raw_labels, alias_map)
        base_reject_alias = candidate_name in reject_aliases or any(
            normalize_candidate_name(label) in reject_aliases for label in raw_labels
        )
        decision, reason, append = decision_for(
            candidate_name,
            int(candidate["images"]),
            len(sources),
            existing_canonical,
            base_reject_alias,
            policy,
        )
        scorecard.append(
            {
                "candidate_name": candidate_name,
                "decision": decision,
                "append_to_taxonomy": append,
                "existing_canonical_class": existing_canonical,
                "parent_class": parent_class_for(candidate_name, base_class_set),
                "images": int(candidate["images"]),
                "instances": int(candidate["instances"]),
                "source_count": len(sources),
                "sources": "|".join(sources),
                "raw_labels": "|".join(raw_labels),
                "nutrition_relevant": is_high_value(candidate_name, policy),
                "preparation_specific": is_preparation_specific(candidate_name, policy),
                "reject_reason": reason if decision == "reject" else "",
                "decision_reason": reason,
            }
        )
    priority = {
        "priority_accept": 0,
        "accept": 1,
        "existing": 2,
        "hold_more_data": 3,
        "merge_to_existing": 4,
        "reject": 5,
    }
    return sorted(
        scorecard,
        key=lambda row: (priority.get(str(row["decision"]), 99), -int(row["images"]), str(row["candidate_name"])),
    )


def build_expanded_taxonomy(base_taxonomy: dict[str, Any], scorecard: list[dict[str, Any]]) -> dict[str, Any]:
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
    expanded["classes"] = classes
    expanded["aliases"] = aliases
    return expanded


def summarize_scorecard(scorecard: list[dict[str, Any]], base_class_count: int) -> dict[str, Any]:
    counts: defaultdict[str, int] = defaultdict(int)
    for row in scorecard:
        counts[str(row["decision"])] += 1
    accepted_new = [
        row["candidate_name"]
        for row in scorecard
        if row.get("append_to_taxonomy") and row.get("decision") in {"accept", "priority_accept"}
    ]
    return {
        "base_class_count": base_class_count,
        "accepted_new_classes": len(accepted_new),
        "final_class_count_if_applied": base_class_count + len(accepted_new),
        "decision_counts": dict(sorted(counts.items())),
        "accepted_new_class_names": accepted_new,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Mine and gate YOLO11 Clean V3 candidate classes from audited labels.")
    parser.add_argument("--class-candidates", type=Path, required=True)
    parser.add_argument("--base-taxonomy", type=Path, required=True)
    parser.add_argument("--policy", type=Path, default=None)
    parser.add_argument("--scorecard-out", type=Path, required=True)
    parser.add_argument("--summary-out", type=Path, required=True)
    parser.add_argument("--expanded-taxonomy-out", type=Path, default=None)
    parser.add_argument("--write-taxonomy", action="store_true")
    args = parser.parse_args(argv)

    class_rows = read_csv(args.class_candidates)
    base_taxonomy = load_yaml(args.base_taxonomy)
    base_classes = taxonomy_classes(base_taxonomy)
    policy = load_policy(args.policy)
    scorecard = score_candidates(class_rows, policy=policy, base_taxonomy=base_taxonomy)
    write_csv(args.scorecard_out, scorecard)
    write_json(args.summary_out, summarize_scorecard(scorecard, len(base_classes)))
    if args.write_taxonomy:
        if args.expanded_taxonomy_out is None:
            parser.error("--expanded-taxonomy-out is required with --write-taxonomy")
        dump_yaml(args.expanded_taxonomy_out, build_expanded_taxonomy(base_taxonomy, scorecard))
    print(json.dumps(summarize_scorecard(scorecard, len(base_classes)), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
