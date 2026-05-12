# YOLO11 Public Golden Seed Handoff - 2026-05-12

## Current State

The YOLO11m Clean V1 model is integrated as `ai-provider/best.onnx` and the
rollback artifact is `ai-provider/model_backups/yolov8_rollback/best.pt`.

The official promote manifest `ai-provider/dataset_v2/golden_eval_manifest.csv`
is still empty except for the header, so YOLO11m Clean V1 must not be frozen as
production based on the current repo state.

Because real app scan photos are limited, a public diagnostic seed was created
from Openverse-first public image search. This seed is only for diagnosis and
Clean V2 hard-mining. It is not a production promote gate until labels and
licenses are manually audited.

## Implemented Tooling

- `ai-provider/dataset_v2/build_public_golden_seed.py`
  - Builds a public, license-attributed seed set.
  - Uses Openverse first, Wikimedia Commons fallback only when `--source-mode all`
    is requested.
  - Uses retry/backoff, skips failing sources, writes partial manifest output
    after each label, and supports `--max-images` to avoid long-running failures.
- `ai-provider/dataset_v2/sweep_yolo_runtime_thresholds.py`
  - Runs isolated runtime-provider golden eval subprocesses with different YOLO
    threshold/recovery env settings.
  - Disables Gemini vision fallback for model gate integrity.
- `ai-provider/dataset_v2/README.md`
  - Documents the public seed command and threshold sweep command.

## Commands Run

Build public seed:

```powershell
.\ai-provider\.venv\Scripts\python.exe ai-provider\dataset_v2\build_public_golden_seed.py `
  --out-dir _dataset_v2_reports\golden_eval_public_web_seed_fast_2026-05-12 `
  --per-label 5 `
  --search-limit 20 `
  --max-images 80 `
  --source-mode openverse `
  --sleep-seconds 0.01
```

Validate manifest:

```powershell
.\ai-provider\.venv\Scripts\python.exe ai-provider\dataset_v2\evaluate_golden_set.py `
  --manifest _dataset_v2_reports\golden_eval_public_web_seed_fast_2026-05-12\manifest.csv `
  --validate-only
```

Baseline runtime eval:

```powershell
$env:YOLO_GEMINI_VISION_FALLBACK_ENABLED='false'
.\ai-provider\.venv\Scripts\python.exe ai-provider\dataset_v2\evaluate_golden_set.py `
  --old-model ai-provider\model_backups\yolov8_rollback\best.pt `
  --new-runtime-provider `
  --manifest _dataset_v2_reports\golden_eval_public_web_seed_fast_2026-05-12\manifest.csv `
  --out _dataset_v2_reports\public_web_seed_fast_runtime.json `
  --errors-out _dataset_v2_reports\public_web_seed_fast_runtime_errors.csv `
  --min-images 80
```

Threshold sweep:

```powershell
.\ai-provider\.venv\Scripts\python.exe ai-provider\dataset_v2\sweep_yolo_runtime_thresholds.py `
  --manifest _dataset_v2_reports\golden_eval_public_web_seed_fast_2026-05-12\manifest.csv `
  --out-dir _dataset_v2_reports\runtime_threshold_sweep_public_web_seed_fast `
  --summary-out _dataset_v2_reports\runtime_threshold_sweep_public_web_seed_fast_summary.json `
  --min-images 80 `
  --primary-conf 0.03,0.05,0.08,0.15,0.25 `
  --recovery-conf 0.05 `
  --recovery-size 320
```

## Results

Public seed build:

- 80 images total.
- 5 images each for `rice`, `beef`, `chicken`, `fried_egg`, `pork`,
  `broccoli`, `cabbage`, `carrot`, `tomato`, `potato`, `onion`, `garlic`,
  `ginger`, `banh_mi`, `com_tam`, and `banh_xeo`.
- `pho`, `bun_bo_hue`, `goi_cuon`, and `tofu` were not reached before the
  `--max-images 80` cap.

Baseline runtime eval on the public seed:

- `new_hit_rate`: `0.3375`
- `new_empty_image_rate`: `0.3375`
- `regression_rate`: `0.125`
- Decision: `tune_runtime_thresholds_first`

Best threshold sweep result:

- `YOLO_CONFIDENCE_THRESHOLD=0.03`
- `YOLO_RECOVERY_CONFIDENCE_THRESHOLD=0.05`
- `YOLO_RECOVERY_IMAGE_SIZE=320`
- `new_hit_rate`: `0.45`
- `new_empty_image_rate`: `0.025`
- `regression_rate`: `0.0625`
- Decision: `build_yolo11m_clean_v2`

Top missing classes from the best sweep error CSV:

| Missing class | Count |
| --- | ---: |
| `pork` | 5 |
| `potato` | 5 |
| `garlic` | 4 |
| `ginger` | 4 |
| `onion` | 4 |
| `cabbage` | 3 |
| `beef` | 3 |
| `fried_egg` | 3 |
| `chicken` | 3 |
| `com_tam` | 2 |
| `banh_mi` | 2 |
| `broccoli` | 2 |
| `rice` | 2 |
| `tomato` | 2 |

## Next Step

Do not promote YOLO11m Clean V1 from the current evidence. Threshold tuning
improves empty detections but does not bring hit-rate near the `0.72` gate.

Continue with YOLO11m Clean V2:

1. Manually audit the public seed labels/licenses before treating them as hard
   evaluation evidence.
2. Use the best sweep error CSV to hard-mine `pork`, `potato`, `garlic`,
   `ginger`, `onion`, `cabbage`, `beef`, `fried_egg`, and `chicken`.
3. Update a dated Clean V2 taxonomy/source policy.
4. Train YOLO11m Clean V2 and rerun the same golden/runtime gate.
5. Consider YOLO11l only after YOLO11m Clean V2 fails for capacity reasons,
   not because of missing data, bad labels, or threshold policy.

## Verification

Fresh checks run after implementation:

```text
test_dataset_v2_public_golden_seed.py: 2 tests passed
test_dataset_v2_runtime_threshold_sweep.py: 3 tests passed
py_compile build_public_golden_seed.py sweep_yolo_runtime_thresholds.py evaluate_golden_set.py: pass
```
