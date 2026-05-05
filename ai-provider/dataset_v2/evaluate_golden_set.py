from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from pathlib import Path


def load_manifest(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return [row for row in csv.DictReader(f) if row.get("image_path")]


def predict_counts(model, image_path: Path, conf: float) -> Counter[str]:
    result = model.predict(str(image_path), conf=conf, verbose=False)[0]
    names = result.names
    counts: Counter[str] = Counter()
    if result.boxes is None:
        return counts
    for cls in result.boxes.cls.tolist():
        counts[str(names[int(cls)])] += 1
    return counts


def score_expected(predicted: Counter[str], expected_objects: str) -> dict[str, int]:
    expected = [item.strip() for item in expected_objects.replace(";", ",").split(",") if item.strip()]
    hits = sum(1 for item in expected if predicted.get(item, 0) > 0)
    return {"expected": len(expected), "hits": hits, "predicted_total": sum(predicted.values())}


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare current YOLOv8 and new YOLO11m on EatFitAI golden images.")
    parser.add_argument("--old-model", type=Path, required=True)
    parser.add_argument("--new-model", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--out", type=Path, default=Path("_dataset_v2_reports/golden_eval_comparison.json"))
    parser.add_argument("--conf", type=float, default=0.25)
    args = parser.parse_args()

    from ultralytics import YOLO

    old_model = YOLO(str(args.old_model))
    new_model = YOLO(str(args.new_model))
    rows = load_manifest(args.manifest)
    results = []
    scenario_totals: dict[str, Counter[str]] = {}
    for row in rows:
        image_path = Path(row["image_path"])
        old_counts = predict_counts(old_model, image_path, args.conf)
        new_counts = predict_counts(new_model, image_path, args.conf)
        old_score = score_expected(old_counts, row.get("expected_objects", ""))
        new_score = score_expected(new_counts, row.get("expected_objects", ""))
        scenario = row.get("scenario", "unknown")
        scenario_totals.setdefault(scenario, Counter())
        scenario_totals[scenario].update(
            {
                "old_hits": old_score["hits"],
                "new_hits": new_score["hits"],
                "expected": old_score["expected"],
                "old_predicted_total": old_score["predicted_total"],
                "new_predicted_total": new_score["predicted_total"],
            }
        )
        results.append(
            {
                **row,
                "old_predictions": dict(old_counts),
                "new_predictions": dict(new_counts),
                "old_score": old_score,
                "new_score": new_score,
            }
        )
    output = {
        "summary_by_scenario": {scenario: dict(counter) for scenario, counter in scenario_totals.items()},
        "images": results,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(output["summary_by_scenario"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
