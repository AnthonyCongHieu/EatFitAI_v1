from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from collections import Counter
from pathlib import Path
from typing import Any


DEFAULT_MIN_IMAGES = 300
DEFAULT_MIN_NEW_HIT_RATE = 0.72
DEFAULT_MAX_HIT_RATE_DROP = 0.02
DEFAULT_MAX_NEW_EMPTY_RATE = 0.08
DEFAULT_MAX_REGRESSION_RATE = 0.10


def load_manifest(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        rows = [
            {key: (value or "").strip() for key, value in row.items()}
            for row in csv.DictReader(f)
            if row.get("image_path")
        ]
    if not rows:
        raise RuntimeError(f"Golden eval manifest has no image rows: {path}")
    return rows


def resolve_image_path(image_path: str, manifest_path: Path) -> Path:
    path = Path(image_path)
    if path.is_absolute():
        return path
    return manifest_path.parent / path


def parse_expected_objects(expected_objects: str) -> Counter[str]:
    normalized = expected_objects.replace(";", ",").replace("|", ",").replace("\n", ",")
    counts: Counter[str] = Counter()
    for item in normalized.split(","):
        label = item.strip()
        if not label:
            continue
        counts[label] += 1
    return counts


def predict_counts(model, image_path: Path, conf: float) -> Counter[str]:
    result = model.predict(str(image_path), conf=conf, verbose=False)[0]
    names = result.names
    counts: Counter[str] = Counter()
    if result.boxes is None:
        return counts
    for cls in result.boxes.cls.tolist():
        counts[str(names[int(cls)])] += 1
    return counts


def load_provider_app():
    ai_provider_dir = Path(__file__).resolve().parents[1]
    if str(ai_provider_dir) not in sys.path:
        sys.path.insert(0, str(ai_provider_dir))

    if "YOLO_ONNX_MODEL_FILE" not in os.environ:
        os.environ["YOLO_ONNX_MODEL_FILE"] = str(ai_provider_dir / "best.onnx")

    import app as app_module

    return app_module


def predict_provider_runtime_counts(app_module, image_path: Path) -> Counter[str]:
    primary = app_module._detect_with_onnx(
        str(image_path),
        app_module.YOLO_CONFIDENCE_THRESHOLD,
        app_module.YOLO_ONNX_IMAGE_SIZE,
    )
    detections = primary

    if app_module._should_run_yolo_recovery(detections):
        recovery = app_module._filter_recovery_detections(
            app_module._detect_with_onnx(
                str(image_path),
                app_module.YOLO_RECOVERY_CONFIDENCE_THRESHOLD,
                app_module.YOLO_RECOVERY_IMAGE_SIZE,
            )
        )
        detections = app_module._merge_detections(detections, recovery)

    if app_module._should_run_crop_recovery(detections):
        crop = app_module._detect_with_onnx_crops(
            str(image_path),
            app_module.YOLO_RECOVERY_CONFIDENCE_THRESHOLD,
            app_module.YOLO_RECOVERY_IMAGE_SIZE,
        )
        detections = app_module._merge_detections(detections, crop)

    return Counter(str(detection.get("label", "")).strip().lower() for detection in detections if detection.get("label"))


def score_expected(predicted: Counter[str], expected_objects: str) -> dict[str, int]:
    expected = parse_expected_objects(expected_objects)
    hits = sum(min(predicted.get(item, 0), count) for item, count in expected.items())
    return {"expected": sum(expected.values()), "hits": hits, "predicted_total": sum(predicted.values())}


def compare_expected(
    expected_objects: str,
    old_counts: Counter[str],
    new_counts: Counter[str],
) -> dict[str, dict[str, int]]:
    expected = parse_expected_objects(expected_objects)
    missing_new: Counter[str] = Counter()
    regressions: Counter[str] = Counter()
    gains: Counter[str] = Counter()

    for label, expected_count in expected.items():
        old_hits = min(old_counts.get(label, 0), expected_count)
        new_hits = min(new_counts.get(label, 0), expected_count)
        if new_hits < expected_count:
            missing_new[label] = expected_count - new_hits
        if old_hits > new_hits:
            regressions[label] = old_hits - new_hits
        if new_hits > old_hits:
            gains[label] = new_hits - old_hits

    return {
        "new_missing_expected": dict(missing_new),
        "regressions_vs_old": dict(regressions),
        "new_gains_vs_old": dict(gains),
    }


def _rate(numerator: int | float, denominator: int | float) -> float:
    if denominator == 0:
        return 0.0
    return round(float(numerator) / float(denominator), 4)


def summarize_results(results: list[dict[str, Any]]) -> dict[str, Any]:
    totals: Counter[str] = Counter()
    scenario_totals: dict[str, Counter[str]] = {}
    class_totals: dict[str, Counter[str]] = {}

    for result in results:
        scenario = result.get("scenario") or "unknown"
        scenario_counter = scenario_totals.setdefault(scenario, Counter())

        old_score = result["old_score"]
        new_score = result["new_score"]
        expected = parse_expected_objects(result.get("expected_objects", ""))
        comparisons = result["comparison"]

        base_updates = {
            "images": 1,
            "expected": old_score["expected"],
            "old_hits": old_score["hits"],
            "new_hits": new_score["hits"],
            "old_predicted_total": old_score["predicted_total"],
            "new_predicted_total": new_score["predicted_total"],
            "old_empty_images": int(old_score["predicted_total"] == 0),
            "new_empty_images": int(new_score["predicted_total"] == 0),
            "regression_expected_hits": sum(comparisons["regressions_vs_old"].values()),
            "new_gain_expected_hits": sum(comparisons["new_gains_vs_old"].values()),
        }
        totals.update(base_updates)
        scenario_counter.update(base_updates)

        old_predictions = Counter(result["old_predictions"])
        new_predictions = Counter(result["new_predictions"])
        for label, expected_count in expected.items():
            class_counter = class_totals.setdefault(label, Counter())
            old_hits = min(old_predictions.get(label, 0), expected_count)
            new_hits = min(new_predictions.get(label, 0), expected_count)
            class_counter.update(
                {
                    "expected": expected_count,
                    "old_hits": old_hits,
                    "new_hits": new_hits,
                    "new_missing": max(expected_count - new_hits, 0),
                    "regression_expected_hits": max(old_hits - new_hits, 0),
                    "new_gain_expected_hits": max(new_hits - old_hits, 0),
                }
            )

    def finalize(counter: Counter[str]) -> dict[str, Any]:
        output = dict(counter)
        output["old_hit_rate"] = _rate(counter["old_hits"], counter["expected"])
        output["new_hit_rate"] = _rate(counter["new_hits"], counter["expected"])
        output["hit_rate_delta"] = round(output["new_hit_rate"] - output["old_hit_rate"], 4)
        output["old_empty_image_rate"] = _rate(counter["old_empty_images"], counter["images"])
        output["new_empty_image_rate"] = _rate(counter["new_empty_images"], counter["images"])
        output["regression_rate"] = _rate(counter["regression_expected_hits"], counter["expected"])
        output["new_gain_rate"] = _rate(counter["new_gain_expected_hits"], counter["expected"])
        return output

    return {
        "overall": finalize(totals),
        "by_scenario": {scenario: finalize(counter) for scenario, counter in scenario_totals.items()},
        "by_class": {label: finalize(counter) for label, counter in class_totals.items()},
    }


def decide_next_step(
    summary: dict[str, Any],
    *,
    min_images: int = DEFAULT_MIN_IMAGES,
    min_new_hit_rate: float = DEFAULT_MIN_NEW_HIT_RATE,
    max_hit_rate_drop: float = DEFAULT_MAX_HIT_RATE_DROP,
    max_new_empty_rate: float = DEFAULT_MAX_NEW_EMPTY_RATE,
    max_regression_rate: float = DEFAULT_MAX_REGRESSION_RATE,
) -> dict[str, Any]:
    overall = summary["overall"]
    gates = {
        "min_images": overall["images"] >= min_images,
        "new_hit_rate_floor": overall["new_hit_rate"] >= min_new_hit_rate,
        "not_worse_than_old": overall["hit_rate_delta"] >= -max_hit_rate_drop,
        "new_empty_rate_ok": overall["new_empty_image_rate"] <= max_new_empty_rate,
        "regression_rate_ok": overall["regression_rate"] <= max_regression_rate,
    }

    if not gates["min_images"]:
        status = "collect_more_golden_images"
        next_step = "Add more real app photos before freezing V1 or starting Clean V2."
    elif all(gates.values()):
        status = "promote_yolo11m_clean_v1"
        next_step = "Freeze YOLO11m Clean V1 as the production model and keep YOLOv8 as rollback only."
    elif gates["not_worse_than_old"] and not gates["new_empty_rate_ok"]:
        status = "tune_runtime_thresholds_first"
        next_step = "Tune confidence/recovery thresholds before changing the dataset or training a larger model."
    else:
        status = "build_yolo11m_clean_v2"
        next_step = "Use the error CSV for hard-mining, expand/fix Dataset V2, then train YOLO11m Clean V2 before considering YOLO11l."

    return {
        "status": status,
        "next_step": next_step,
        "gates": gates,
        "thresholds": {
            "min_images": min_images,
            "min_new_hit_rate": min_new_hit_rate,
            "max_hit_rate_drop": max_hit_rate_drop,
            "max_new_empty_rate": max_new_empty_rate,
            "max_regression_rate": max_regression_rate,
        },
        "yolo11l_gate": "Only evaluate YOLO11l after YOLO11m Clean V2 still fails accuracy gates and Kaggle quota is available.",
    }


def validate_images_exist(rows: list[dict[str, str]], manifest_path: Path) -> None:
    missing = [
        row["image_path"]
        for row in rows
        if not resolve_image_path(row["image_path"], manifest_path).exists()
    ]
    if missing:
        preview = ", ".join(missing[:10])
        raise RuntimeError(f"Golden eval manifest references missing images: {preview}")


def write_error_csv(results: list[dict[str, Any]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "image_path",
        "scenario",
        "expected_objects",
        "new_missing_expected",
        "regressions_vs_old",
        "new_gains_vs_old",
        "old_predictions",
        "new_predictions",
        "notes",
    ]
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in results:
            comparison = row["comparison"]
            if not comparison["new_missing_expected"] and not comparison["regressions_vs_old"]:
                continue
            writer.writerow(
                {
                    "image_path": row.get("image_path", ""),
                    "scenario": row.get("scenario", ""),
                    "expected_objects": row.get("expected_objects", ""),
                    "new_missing_expected": json.dumps(
                        comparison["new_missing_expected"], ensure_ascii=False, sort_keys=True
                    ),
                    "regressions_vs_old": json.dumps(
                        comparison["regressions_vs_old"], ensure_ascii=False, sort_keys=True
                    ),
                    "new_gains_vs_old": json.dumps(
                        comparison["new_gains_vs_old"], ensure_ascii=False, sort_keys=True
                    ),
                    "old_predictions": json.dumps(row["old_predictions"], ensure_ascii=False, sort_keys=True),
                    "new_predictions": json.dumps(row["new_predictions"], ensure_ascii=False, sort_keys=True),
                    "notes": row.get("notes", ""),
                }
            )


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare current YOLOv8 and new YOLO11m on EatFitAI golden images.")
    parser.add_argument("--old-model", type=Path)
    parser.add_argument("--new-model", type=Path)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--out", type=Path, default=Path("_dataset_v2_reports/golden_eval_comparison.json"))
    parser.add_argument("--errors-out", type=Path, default=Path("_dataset_v2_reports/golden_eval_errors.csv"))
    parser.add_argument("--conf", type=float, default=0.25)
    parser.add_argument(
        "--new-runtime-provider",
        action="store_true",
        help="Evaluate the new model through ai-provider/app.py ONNX recovery pipeline instead of direct Ultralytics predict.",
    )
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--min-images", type=int, default=DEFAULT_MIN_IMAGES)
    parser.add_argument("--min-new-hit-rate", type=float, default=DEFAULT_MIN_NEW_HIT_RATE)
    parser.add_argument("--max-hit-rate-drop", type=float, default=DEFAULT_MAX_HIT_RATE_DROP)
    parser.add_argument("--max-new-empty-rate", type=float, default=DEFAULT_MAX_NEW_EMPTY_RATE)
    parser.add_argument("--max-regression-rate", type=float, default=DEFAULT_MAX_REGRESSION_RATE)
    args = parser.parse_args()

    rows = load_manifest(args.manifest)
    validate_images_exist(rows, args.manifest)
    if args.validate_only:
        print(json.dumps({"manifest": str(args.manifest), "images": len(rows), "status": "ok"}, ensure_ascii=False))
        return 0

    if not args.old_model:
        parser.error("--old-model is required unless --validate-only is set")
    if not args.new_runtime_provider and not args.new_model:
        parser.error("--new-model is required unless --new-runtime-provider or --validate-only is set")

    from ultralytics import YOLO

    old_model = YOLO(str(args.old_model))
    new_model = None if args.new_runtime_provider else YOLO(str(args.new_model))
    provider_app = load_provider_app() if args.new_runtime_provider else None
    results = []
    for row in rows:
        image_path = resolve_image_path(row["image_path"], args.manifest)
        old_counts = predict_counts(old_model, image_path, args.conf)
        if provider_app is not None:
            new_counts = predict_provider_runtime_counts(provider_app, image_path)
        else:
            new_counts = predict_counts(new_model, image_path, args.conf)
        old_score = score_expected(old_counts, row.get("expected_objects", ""))
        new_score = score_expected(new_counts, row.get("expected_objects", ""))
        results.append(
            {
                **row,
                "resolved_image_path": str(image_path),
                "old_predictions": dict(old_counts),
                "new_predictions": dict(new_counts),
                "old_score": old_score,
                "new_score": new_score,
                "comparison": compare_expected(row.get("expected_objects", ""), old_counts, new_counts),
            }
        )
    summary = summarize_results(results)
    decision = decide_next_step(
        summary,
        min_images=args.min_images,
        min_new_hit_rate=args.min_new_hit_rate,
        max_hit_rate_drop=args.max_hit_rate_drop,
        max_new_empty_rate=args.max_new_empty_rate,
        max_regression_rate=args.max_regression_rate,
    )
    output = {
        "summary": summary,
        "decision": decision,
        "new_prediction_mode": "ai_provider_runtime" if args.new_runtime_provider else "direct_model",
        "images": results,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_error_csv(results, args.errors_out)
    print(json.dumps({"overall": summary["overall"], "decision": decision}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
