from __future__ import annotations

import argparse
import csv
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable


DEFAULT_QUERIES = [
    "vietfood68",
    "vietnamese food",
    "food detection yolo",
    "food object detection",
    "fruit detection yolo",
    "vegetable detection yolo",
    "fruit vegetable object detection",
    "food segmentation",
    "food ingredient dataset",
]

REJECT_TERMS = {
    "weed",
    "trash",
    "recycling",
    "plastic",
    "algae",
    "skin",
    "wine quality",
    "review",
    "sentiment",
    "recipe",
    "nutrition database",
    "allergen",
}
FOOD_TERMS = {"food", "fruit", "vegetable", "ingredient", "viet", "vietnam", "meal", "dish", "tray"}
DETECTION_TERMS = {"yolo", "object detection", "detection", "bounding box", "bbox", "segmentation"}
VIETNAMESE_TERMS = {"viet", "vietnam", "vietnamese"}
RISKY_LICENSE_TERMS = {"noncommercial", "no derivatives", "nc-nd", "nc-sa"}

DECISION_RANK = {
    "KAGGLE_AUDIT_CANDIDATE": 0,
    "LICENSE_REVIEW_AUDIT_CANDIDATE": 1,
    "SEGMENT_CONVERT_AUDIT_CANDIDATE": 2,
    "CLASSIFICATION_OR_FORMAT_VERIFY": 3,
    "HOLD_FORMAT_VERIFY": 4,
    "REJECT_METADATA": 5,
}


@dataclass
class DatasetCandidate:
    ref: str
    title: str = ""
    subtitle: str = ""
    description: str = ""
    url: str = ""
    license: str = ""
    total_bytes: int | str = ""
    download_count: int = 0
    vote_count: int = 0
    usability_rating: float | str = ""
    last_updated: str = ""
    matched_queries: list[str] = field(default_factory=list)


@dataclass
class CandidateDecision:
    ref: str
    title: str
    url: str
    license: str
    total_bytes: int | str
    download_count: int
    vote_count: int
    usability_rating: float | str
    last_updated: str
    matched_queries: list[str]
    public_decision: str
    quality_score: float
    reason: str


def metadata_blob(candidate: DatasetCandidate) -> str:
    return " ".join(
        str(value)
        for value in (
            candidate.ref,
            candidate.title,
            candidate.subtitle,
            candidate.description,
        )
    ).lower()


def trace_blob(candidate: DatasetCandidate) -> str:
    return " ".join([metadata_blob(candidate), " ".join(candidate.matched_queries).lower()])


def has_any(text: str, terms: Iterable[str]) -> bool:
    return any(term in text for term in terms)


def int_value(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def float_value(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def base_quality_score(candidate: DatasetCandidate) -> float:
    score = 0.0
    score += min(int_value(candidate.vote_count), 50) * 4
    score += min(int_value(candidate.download_count) / 100, 50)
    score += float_value(candidate.usability_rating) * 20
    text = metadata_blob(candidate)
    if has_any(text, VIETNAMESE_TERMS):
        score += 40
    if "yolo" in text:
        score += 30
    if "object detection" in text or "bounding box" in text or "bbox" in text:
        score += 25
    if "ingredient" in text:
        score += 15
    if "fruit" in text or "vegetable" in text:
        score += 8
    return round(score, 2)


def decide_candidate(candidate: DatasetCandidate) -> CandidateDecision:
    text = metadata_blob(candidate)
    license_text = str(candidate.license).lower()
    has_food = has_any(text, FOOD_TERMS)
    has_detection = has_any(text, DETECTION_TERMS)
    has_vietnamese = has_any(text, VIETNAMESE_TERMS)
    has_reject = has_any(text, REJECT_TERMS)
    risky_license = has_any(license_text, RISKY_LICENSE_TERMS)

    if has_reject or not has_food:
        public_decision = "REJECT_METADATA"
        reason = "Likely unrelated, text/table-only, or not useful for the EatFitAI food detector."
        score = 0.0
    elif has_detection and risky_license:
        public_decision = "LICENSE_REVIEW_AUDIT_CANDIDATE"
        reason = "Food detector source signal is present, but license must be reviewed before inclusion."
        score = base_quality_score(candidate)
    elif "segmentation" in text and "yolo" not in text and "object detection" not in text:
        public_decision = "SEGMENT_CONVERT_AUDIT_CANDIDATE"
        reason = "Food segmentation source may be useful only after mask/segment-to-bbox conversion audit."
        score = base_quality_score(candidate)
    elif has_food and has_detection:
        public_decision = "KAGGLE_AUDIT_CANDIDATE"
        reason = "Food-domain metadata and detection/YOLO/bbox signal; raw format still must be audited."
        score = base_quality_score(candidate)
    elif has_vietnamese:
        public_decision = "CLASSIFICATION_OR_FORMAT_VERIFY"
        reason = "Vietnamese food domain is relevant, but public metadata does not prove bbox/detection format."
        score = base_quality_score(candidate) * 0.6
    else:
        public_decision = "HOLD_FORMAT_VERIFY"
        reason = "Food-domain metadata is present, but bbox/detection evidence is weak."
        score = base_quality_score(candidate) * 0.4

    return CandidateDecision(
        ref=candidate.ref,
        title=candidate.title,
        url=candidate.url,
        license=candidate.license,
        total_bytes=candidate.total_bytes,
        download_count=int_value(candidate.download_count),
        vote_count=int_value(candidate.vote_count),
        usability_rating=candidate.usability_rating,
        last_updated=candidate.last_updated,
        matched_queries=list(dict.fromkeys(candidate.matched_queries)),
        public_decision=public_decision,
        quality_score=round(score, 2),
        reason=reason,
    )


def rank_candidates(candidates: list[CandidateDecision]) -> list[CandidateDecision]:
    return sorted(
        candidates,
        key=lambda item: (
            DECISION_RANK.get(item.public_decision, 99),
            -item.quality_score,
            -int_value(item.vote_count),
            -int_value(item.download_count),
            item.ref,
        ),
    )


def get_attr(item: Any, snake: str, camel: str | None = None, default: Any = "") -> Any:
    value = getattr(item, snake, None)
    if value is None and camel:
        value = getattr(item, camel, None)
    return default if value is None else value


def candidate_from_kaggle_item(item: Any, query: str) -> DatasetCandidate:
    return DatasetCandidate(
        ref=str(get_attr(item, "ref")),
        title=str(get_attr(item, "title")),
        subtitle=str(get_attr(item, "subtitle")),
        description=str(get_attr(item, "description")),
        url=str(get_attr(item, "url")),
        license=str(get_attr(item, "license_name", "licenseName")),
        total_bytes=get_attr(item, "total_bytes", "totalBytes"),
        download_count=int_value(get_attr(item, "download_count", "downloadCount", 0)),
        vote_count=int_value(get_attr(item, "vote_count", "voteCount", 0)),
        usability_rating=get_attr(item, "usability_rating", "usabilityRating"),
        last_updated=str(get_attr(item, "last_updated", "lastUpdated")),
        matched_queries=[query],
    )


def merge_candidate(existing: DatasetCandidate, incoming: DatasetCandidate) -> DatasetCandidate:
    existing.matched_queries.extend(incoming.matched_queries)
    for field_name in ("title", "subtitle", "description", "url", "license", "total_bytes", "last_updated"):
        if not getattr(existing, field_name) and getattr(incoming, field_name):
            setattr(existing, field_name, getattr(incoming, field_name))
    existing.download_count = max(int_value(existing.download_count), int_value(incoming.download_count))
    existing.vote_count = max(int_value(existing.vote_count), int_value(incoming.vote_count))
    if float_value(incoming.usability_rating) > float_value(existing.usability_rating):
        existing.usability_rating = incoming.usability_rating
    return existing


def search_kaggle_sources(queries: list[str], top_per_query: int) -> list[CandidateDecision]:
    from kaggle.api.kaggle_api_extended import KaggleApi

    api = KaggleApi()
    api.authenticate()
    candidates: dict[str, DatasetCandidate] = {}
    for query in queries:
        for item in (api.dataset_list(search=query) or [])[:top_per_query]:
            candidate = candidate_from_kaggle_item(item, query)
            if not candidate.ref:
                continue
            if candidate.ref in candidates:
                candidates[candidate.ref] = merge_candidate(candidates[candidate.ref], candidate)
            else:
                candidates[candidate.ref] = candidate
    return rank_candidates([decide_candidate(candidate) for candidate in candidates.values()])


def write_candidates_csv(path: Path, candidates: list[CandidateDecision]) -> None:
    fieldnames = [
        "ref",
        "title",
        "url",
        "license",
        "total_bytes",
        "download_count",
        "vote_count",
        "usability_rating",
        "last_updated",
        "matched_queries",
        "public_decision",
        "quality_score",
        "reason",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for candidate in candidates:
            row = candidate.__dict__.copy()
            row["matched_queries"] = "; ".join(candidate.matched_queries)
            writer.writerow(row)


def main() -> int:
    parser = argparse.ArgumentParser(description="Search and score Kaggle dataset candidates for EatFitAI Dataset V2.")
    parser.add_argument("--query", action="append", dest="queries", default=None, help="Search query. Can be repeated.")
    parser.add_argument("--queries-file", type=Path, default=None, help="Optional newline-delimited query file.")
    parser.add_argument("--top-per-query", type=int, default=20)
    parser.add_argument("--out", type=Path, default=Path("_dataset_v2_reports/kaggle_source_candidates.csv"))
    parser.add_argument("--json-out", type=Path, default=None)
    args = parser.parse_args()

    queries = args.queries or list(DEFAULT_QUERIES)
    if args.queries_file:
        file_queries = [line.strip() for line in args.queries_file.read_text(encoding="utf-8-sig").splitlines() if line.strip() and not line.startswith("#")]
        queries.extend(file_queries)
    candidates = search_kaggle_sources(list(dict.fromkeys(queries)), args.top_per_query)
    write_candidates_csv(args.out, candidates)
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps([candidate.__dict__ for candidate in candidates], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    counts: dict[str, int] = {}
    for candidate in candidates:
        counts[candidate.public_decision] = counts.get(candidate.public_decision, 0) + 1
    print(json.dumps({"out": str(args.out), "counts": counts}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
