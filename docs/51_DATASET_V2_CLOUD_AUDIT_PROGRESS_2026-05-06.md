# Dataset V2 Cloud Audit Progress - 2026-05-06

This note records the current verified cloud-only Dataset V2 state. Do not use
public Drive or gdown as fallback paths. Raw zip files stay out of the local
machine; local downloads are limited to Kaggle reports, logs, and sample grids.

## Git Baseline

Current branch:

```text
codex/yolo11m-dataset-v2
```

Relevant recent commits:

```text
f41485c0 Create 50_PRODUCTION_INFRASTRUCTURE_COST_PLAN_2026-05-06.md
fa9d71cd Fix VietFood67 external class audit
b513c4b0 Implement dataset v2 cloud audit workflow
```

## Verified Kaggle Kernel Status

Checked on 2026-05-06:

```text
hiuinhcng/eatfitai-dataset-v2-large-source-audit       COMPLETE
hiuinhcng/eatfitai-dataset-v2-public-drive-raw-audit   COMPLETE
hiuinhcng/eatfitai-dataset-v2-drive-secret-smoke       COMPLETE
hiuinhcng/eatfitai-dataset-v2-raw-audit                COMPLETE
```

## Large Source Lane

Kernel: `EatFitAI Dataset V2 Large Source Audit`

Current verified output:

| source_slug | status | decision | classes | images | boxes | notes |
| --- | --- | --- | ---: | ---: | ---: | --- |
| `vietfood67` | audited | `ACCEPT_FILTERED` | 68 | 3002 | 5241 | `data_yaml_missing;external_class_map_used` |
| `food_data_truongvo` | not audited | blocked | | | | `roboflow_secret_missing` |

Interpretation:

- `vietfood67` is now correctly audited through the mounted Kaggle dataset.
- The missing `data.yaml` is expected and is handled by
  `ai-provider/dataset_v2/source_class_maps.yaml`.
- `food_data_truongvo` is still blocked until the target Kaggle notebook has
  `ROBOFLOW_API_KEY` attached and enabled.

Required user action before the next run:

1. Open `https://www.kaggle.com/code/hiuinhcng/eatfitai-dataset-v2-large-source-audit/edit`.
2. Add or enable Kaggle Secret `ROBOFLOW_API_KEY`.
3. Save Version for the notebook.

After that, run:

```powershell
python ai-provider\dataset_v2\kaggle_remote_orchestrator.py output --kernel-id "hiuinhcng/eatfitai-dataset-v2-large-source-audit" --out-dir "_dataset_v2_reports\kaggle_large_source_audit"
```

Then inspect `large_source_audit_status.csv`, `source_audit.csv`, and
`sample_grids`.

## Public Drive OAuth Cache Lane

Kernel: `EatFitAI Dataset V2 Public Drive Raw Audit`

Current verified output:

```json
{
  "download_status_counts": {
    "drive_secret_unreachable": 19
  },
  "audit_status_counts": {
    "not_audited": 19
  },
  "cache_upload": {
    "cache_status": "no_cache_candidates"
  }
}
```

Interpretation:

- The Drive smoke notebook has already proven `RCLONE_DRIVE_CONF` can work:
  `drive_oauth_ok`.
- The public-drive raw audit notebook itself still cannot reach the Kaggle
  secrets service, so the secret must be attached and enabled on that notebook
  too. Kaggle secrets are notebook-scoped.

Required user action before the next public-drive cache pass:

1. Open `https://www.kaggle.com/code/hiuinhcng/eatfitai-dataset-v2-public-drive-raw-audit/edit`.
2. Enable Kaggle Secrets `RCLONE_DRIVE_CONF` and `KAGGLE_API_TOKEN`.
3. Save Version for the notebook.

After that, run:

```powershell
python ai-provider\dataset_v2\kaggle_remote_orchestrator.py output --kernel-id "hiuinhcng/eatfitai-dataset-v2-public-drive-raw-audit" --out-dir "_dataset_v2_reports\kaggle_public_drive_raw_audit"
```

Expected next state:

- download statuses should move from `drive_secret_unreachable` to
  `downloaded_oauth_drive`, `resource_blocked_expected_size`,
  `drive_oauth_failed`, or another explicit per-source status.
- successful, non-quarantined small sources should be prepared for the private
  Kaggle raw audit cache dataset.

## Roboflow Small Raw Audit Lane

Kernel: `EatFitAI Dataset V2 Raw Audit`

Current verified output:

| source_slug | decision | classes | images | boxes |
| --- | --- | ---: | ---: | ---: |
| `detection_15_vietnamese_food_v2.v1i.yolov11` | `ACCEPT_FILTERED` | 15 | 3036 | 4264 |
| `food_ingredients_dataset.v1i.yolov11` | `ACCEPT_FILTERED` | 60 | 626 | 1845 |

These are not enough to build the final clean set by themselves. They are
accepted audit candidates and still require sample-grid review, class mapping,
and merge decisions.

## Next Execution Order

1. Enable `ROBOFLOW_API_KEY` on the large-source notebook and Save Version.
2. Download and inspect the new large-source reports.
3. Enable `RCLONE_DRIVE_CONF` and `KAGGLE_API_TOKEN` on the public-drive raw
   audit notebook and Save Version.
4. Download and inspect the new public-drive OAuth/cache reports.
5. Merge report evidence from:
   - 23 Drive candidates.
   - Roboflow discovery candidates.
   - Kaggle discovery candidates.
   - large-source lane.
6. Promote only top-tier clean candidates:
   - strong Vietnamese-food fit;
   - moderate class count;
   - useful mix of finished dishes, ingredients, spices, and food materials;
   - high Vietnamese/common-Vietnamese ratio;
   - clean labels and sample grids;
   - license tracked and acceptable for the intended private training lane.
7. Build a clean candidate YOLO dataset.
8. Validate gates before YOLO11m training.

## Current Blockers

| blocker | affected lane | status |
| --- | --- | --- |
| `ROBOFLOW_API_KEY` not enabled on large-source notebook | `food_data_truongvo` | waiting for notebook secret enable |
| `RCLONE_DRIVE_CONF` not reachable on public-drive notebook | 19 Drive OAuth/cache sources | waiting for notebook secret enable |
| manual sample-grid judgement | all accepted candidates | pending after fresh reports |

