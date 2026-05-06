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
5fc9bebd docs: update dataset v2 large source audit results
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
| `food_data_truongvo` | audited | `ACCEPT_FILTERED` | 30 | 8205 | 11181 | cached to private Kaggle raw-audit cache |

Interpretation:

- `vietfood67` is now correctly audited through the mounted Kaggle dataset.
- The missing `data.yaml` is expected and is handled by
  `ai-provider/dataset_v2/source_class_maps.yaml`.
- `food_data_truongvo` now uses the Roboflow export path instead of the
  oversized Drive zip. It downloaded `992057392` bytes in Kaggle, audited
  cleanly, generated `sample_grids/food_data_truongvo.jpg`, and uploaded the
  raw zip to private Kaggle Dataset cache
  `hiuinhcng/eatfitai-dataset-v2-raw-audit-cache`.

Completed action:

1. `ROBOFLOW_API_KEY` was enabled on the large-source notebook.
2. Kaggle version 8 completed.
3. Reports were downloaded to a local temp report folder only; no raw zip was
   downloaded locally.

Reproduce report download:

```powershell
python ai-provider\dataset_v2\kaggle_remote_orchestrator.py output --kernel-id "hiuinhcng/eatfitai-dataset-v2-large-source-audit" --out-dir "_dataset_v2_reports\kaggle_large_source_audit"
```

Manual gate still required before clean merge: inspect `sample_grids`, map class
names to the final taxonomy, cap source weight, and keep `vietfood67` out of
production/commercial clean data unless the `CC BY-NC-SA 4.0` license lane is
explicitly accepted.

## Public Drive OAuth Cache Lane

Kernel: `EatFitAI Dataset V2 Public Drive Raw Audit`

Current verified output:

```json
{
  "download_status_counts": {
    "resource_blocked_expected_size": 2,
    "downloaded_oauth_drive": 19,
    "skipped_by_decision": 2
  },
  "audit_status_counts": {
    "not_audited": 4,
    "audited": 19
  },
  "cache_status_counts": {
    "cached_to_kaggle_dataset": 19
  },
  "cache_upload": {
    "cache_status": "cached_to_kaggle_dataset",
    "dataset_id": "hiuinhcng/eatfitai-dataset-v2-raw-audit-cache"
  }
}
```

Interpretation:

- `RCLONE_DRIVE_CONF` and `KAGGLE_API_TOKEN` are now enabled on the
  public-drive raw audit notebook.
- Kaggle version 11 completed.
- OAuth Drive downloaded and audited 19 Drive sources in Kaggle.
- All 19 successful OAuth Drive sources were uploaded to the private Kaggle
  raw-audit cache dataset:
  `hiuinhcng/eatfitai-dataset-v2-raw-audit-cache`.
- `vietfood67` and `food_data_truongvo` remain blocked on the Drive zip lane
  by the expected `>20GB` gate, but both are already handled by the large-source
  lane (`vietfood67` through Kaggle direct, `food_data_truongvo` through
  Roboflow export/cache).
- `food_union_fruit_old` and `food_detection_3_old` were skipped by existing
  quarantine decisions.

Report snapshot committed in:

```text
ai-provider/dataset_v2/public_drive_oauth_audit_2026-05-06.csv
```

Reproduce report download:

```powershell
python ai-provider\dataset_v2\kaggle_remote_orchestrator.py output --kernel-id "hiuinhcng/eatfitai-dataset-v2-public-drive-raw-audit" --out-dir "_dataset_v2_reports\kaggle_public_drive_raw_audit_after_secret"
```

Key audit cautions before clean merge:

- mixed detect/segment rows need bbox conversion on several sources.
- duplicate label row cleanup is required on `food_prethesis`,
  `food_detection_64`, `uecfood256`, and `food_kcmrd`.
- sample-grid/manual class review remains required before promotion to clean.

## Sample Grid Review Lane

First-pass visual review from the OAuth Drive v11 sample grids is recorded in:

```text
ai-provider/dataset_v2/sample_grid_quality_review_2026-05-06.csv
```

Current clean-candidate interpretation:

- first clean core: `food_data_truongvo`, `rawdata_my_khanh`, `food_items`,
  `canteen_menu`, and filtered `food_prethesis`.
- tail/booster candidates: `vietnamese_food_calories`,
  `banh_dan_gian_nb`, `banh_dan_gian_mien_tay`, `vietnamese_food_5`,
  and `food_ai_tong_hop`.
- ingredient/supplement candidates: `food_kcmrd` and selected overlap from
  `thai_food`.
- hold/cherry-pick only: `uecfood256`, `vegetable_detection`,
  `food_detection_64`, `food_detection_xt7yz`, `npg_project`, and `fish`.
- excluded: `food_union_fruit_old` and `food_detection_3_old`.

This visual review does not override audit decisions by itself. It is the
gate used before class mapping and clean-build inclusion.

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

Next Roboflow cloud-audit scope:

```text
ai-provider/dataset_v2/roboflow_source_scope.2026-05-06.csv
ai-provider/dataset_v2/roboflow_source_scope.phase1_2026-05-06.csv
```

This scope covers the new Roboflow top-tier candidates that are still
metadata-only or need raw-cache parity:

- Vietnamese/booster lane: `detection_15_vietnamese_food_v2`, `mon_chung`,
  `khoa_food_jfsxy`, `vietnamese_food_nhh`.
- Ingredient/spice lane: `food_ingredients_v1`, `food_ingredient_recognition`,
  `food_ingredient_3qyxj`, `spice_caezr`, `ingredient_v0h5a`.

Local API HEAD checks on 2026-05-06 showed known export sizes below 2GB for the
sources that returned links immediately. `mon_chung`, `spice_caezr`, and
`ingredient_v0h5a` returned `202` first, so the Kaggle kernel now polls
Roboflow export generation instead of treating that as a hard failure.

Execution is split into phases after the first 9-source batch stayed `RUNNING`
too long without partial logs. Phase 1 contains only known-ready small exports:
`detection_15_vietnamese_food_v2`, `khoa_food_jfsxy`,
`vietnamese_food_nhh`, and `food_ingredients_v1`. Phase 2 should handle the
larger and initially-`202` sources after phase 1 is verified.

Verified phase-1 retry status on 2026-05-06:

```json
{
  "download_status_counts": {
    "roboflow_secret_missing": 4
  },
  "audit_status_counts": {
    "not_audited": 4
  },
  "source_scope": "roboflow_source_scope.phase1_2026-05-06.csv"
}
```

Version 11 was pushed through the Kaggle API after adding bounded retry around
`UserSecretsClient().get_secret("ROBOFLOW_API_KEY")`. The run still could not
read the Roboflow secret, so the practical conclusion is that API-pushed
versions are not a reliable way to carry the notebook secret attachment for
this lane. The next Roboflow retry must be saved from the Kaggle UI after
confirming `ROBOFLOW_API_KEY` is enabled on the exact large-source notebook.
Do not push another API version after that UI save unless the secret is
re-enabled again in the UI.

Verified phase-1 success status after UI secret enablement:

```json
{
  "download_status_counts": {
    "downloaded_roboflow_export": 4
  },
  "audit_status_counts": {
    "audited": 4
  },
  "cache_upload": {
    "cache_status": "cached_to_kaggle_dataset",
    "dataset_id": "hiuinhcng/eatfitai-dataset-v2-raw-audit-cache"
  }
}
```

Phase-1 source results:

| source_slug | decision | classes | images | boxes | notes |
| --- | --- | ---: | ---: | ---: | --- |
| `detection_15_vietnamese_food_v2` | `ACCEPT_FILTERED` | 15 | 3036 | 4264 | Vietnamese dish source; sample grid generated |
| `khoa_food_jfsxy` | `ACCEPT_FILTERED` | 10 | 997 | 1472 | Vietnamese cake/tail booster; 32 empty labels |
| `vietnamese_food_nhh` | `ACCEPT_FILTERED` | 5 | 1000 | 1411 | focused Vietnamese booster |
| `food_ingredients_v1` | `ACCEPT_FILTERED` | 60 | 626 | 1845 | ingredient supplement; requires class mapping |

Report snapshot committed in:

```text
ai-provider/dataset_v2/roboflow_phase1_v12_audit_2026-05-06.csv
```

Next active Roboflow scope:

```text
ai-provider/dataset_v2/roboflow_source_scope.active_2026-05-06.csv
ai-provider/dataset_v2/roboflow_source_scope.phase2_2026-05-06.csv
```

The active scope now points to phase 2 only:

- `mon_chung`
- `food_ingredient_recognition`
- `food_ingredient_3qyxj`
- `spice_caezr`
- `ingredient_v0h5a`

Runtime scope selection now prefers `active`, then `phase2`, then `phase1`,
then the full Roboflow scope. This keeps phase-1 evidence immutable while
allowing the large-source notebook to run the remaining Roboflow candidates.

Verified phase-2 API-push status:

```json
{
  "download_status_counts": {
    "roboflow_secret_missing": 5
  },
  "audit_status_counts": {
    "not_audited": 5
  },
  "source_scope": "roboflow_source_scope.active_2026-05-06.csv"
}
```

Interpretation: version 13 used the correct active phase-2 scope, but the API
push again did not carry the `ROBOFLOW_API_KEY` notebook secret into runtime.
The next retry must be saved from the Kaggle UI after confirming
`ROBOFLOW_API_KEY` and `KAGGLE_API_TOKEN` are enabled on the exact
large-source notebook.

Report snapshot committed in:

```text
ai-provider/dataset_v2/roboflow_phase2_v13_audit_2026-05-06.csv
```

Kaggle kernel cleanup performed on 2026-05-06:

- deleted obsolete/test kernels: `eatfitai-smoke-check`,
  `train-eatfitai-l-n-1`, `notebook217f244714`, and
  `eatfitai-check-duplicates`.
- retained active/evidence kernels: `eatfitai-dataset-v2-large-source-audit`,
  `eatfitai-dataset-v2-public-drive-raw-audit`,
  `eatfitai-dataset-v2-raw-audit`, and
  `eatfitai-dataset-v2-drive-secret-smoke`.

## Next Execution Order

1. Enable `RCLONE_DRIVE_CONF` and `KAGGLE_API_TOKEN` on the public-drive raw
   audit notebook and Save Version. DONE on 2026-05-06.
2. Download and inspect the new public-drive OAuth/cache reports. DONE for
   version 11.
3. Merge report evidence from:
   - 23 Drive candidates.
   - Roboflow discovery candidates.
   - Kaggle discovery candidates.
   - large-source lane.
4. Promote only top-tier clean candidates:
   - strong Vietnamese-food fit;
   - moderate class count;
   - useful mix of finished dishes, ingredients, spices, and food materials;
   - high Vietnamese/common-Vietnamese ratio;
   - clean labels and sample grids;
   - license tracked and acceptable for the intended private training lane.
5. Build a clean candidate YOLO dataset.
6. Validate gates before YOLO11m training.

## Current Blockers

| blocker | affected lane | status |
| --- | --- | --- |
| Roboflow secret not attached to API-pushed large-source versions | Roboflow phase 1 | resolved by UI Save Version with `ROBOFLOW_API_KEY` enabled; v12 audited/cache 4 sources |
| Roboflow secret not attached to API-pushed large-source versions | Roboflow phase 2 | blocked until UI Save Version with `ROBOFLOW_API_KEY` and `KAGGLE_API_TOKEN` enabled |
| manual sample-grid judgement | all accepted candidates | pending after fresh reports |
| class mapping and segment-to-bbox conversion | accepted Drive/Roboflow candidates | pending before clean build |
| exact license verification | unresolved Drive-origin candidates | pending before public release |
