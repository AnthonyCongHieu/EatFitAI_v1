# EatFitAI Dataset V2 Pipeline

This folder contains the reproducible pipeline for rebuilding the EatFitAI YOLO11m training dataset from raw audited sources.

The pipeline order is:

1. Audit raw sources.
2. Reject bad sources and bad classes.
3. Build a clean YOLO detection dataset.
4. Validate final audit gates.
5. Package for Kaggle.
6. Run smoke training.
7. Run full YOLO11m training.

Do not commit raw datasets, Kaggle tokens, Roboflow tokens, model checkpoints, generated reports, or generated clean datasets.

## Environment

Install the dataset-v2 tooling separately from the production API dependencies:

```powershell
python -m pip install -r ai-provider\dataset_v2\requirements.dataset_v2.txt
```

Kaggle auth supports either the current API token flow (`KAGGLE_API_TOKEN` or `%USERPROFILE%\.kaggle\access_token`) or the legacy `KAGGLE_USERNAME`/`KAGGLE_KEY` credentials. Keep Roboflow in `ROBOFLOW_API_KEY` for registry downloads.

```powershell
python ai-provider\dataset_v2\kaggle_remote_orchestrator.py auth-check --search vietfood68
```

## Local Commands

```powershell
python ai-provider\dataset_v2\discover_kaggle_sources.py --out "_dataset_v2_reports\kaggle_source_candidates.csv" --json-out "_dataset_v2_reports\kaggle_source_candidates.json"
python ai-provider\dataset_v2\audit_sources.py --raw-dir "_dataset_v2_work\raw_zips" --out-dir "_dataset_v2_reports"
python ai-provider\dataset_v2\make_sample_grids.py --audit-json "_dataset_v2_reports\source_audit.json" --out-dir "_dataset_v2_reports\sample_grids"
python ai-provider\dataset_v2\build_clean_dataset.py --audit-json "_dataset_v2_reports\source_audit.json" --taxonomy "_dataset_v2_reports\class_taxonomy.final.yaml" --out-dataset "_dataset_v2_work\clean_dataset" --out-reports "_dataset_v2_reports"
python ai-provider\dataset_v2\validate_clean_dataset.py --dataset "_dataset_v2_work\clean_dataset" --out "_dataset_v2_reports\final_audit_summary.json"
python ai-provider\dataset_v2\build_kaggle_training_package.py --dataset "_dataset_v2_work\clean_dataset" --reports "_dataset_v2_reports" --out-dir "_dataset_v2_kaggle_package"
```

Promote Kaggle discovery rows only after metadata review:

1. `KAGGLE_AUDIT_CANDIDATE`: add the dataset ref to `raw_source_registry.yaml` under `kaggle_sources` or download it into the Drive raw zip folder.
2. `CLASSIFICATION_OR_FORMAT_VERIFY`: inspect files before adding; many are image-classification datasets without YOLO labels.
3. `LICENSE_REVIEW_AUDIT_CANDIDATE`: audit only while license compatibility is unresolved; do not include in production clean data.
4. After promotion, add/update `source_manifest.seed.csv` and `source_decisions.public_review.csv` so the raw package keeps the intended source slug and decision.

## Top-Tier Discovery Gate

The Drive 23-source set is a candidate pool, not the final training set. Re-score it together with new Roboflow/Kaggle candidates before building clean data. Prefer sources that are Vietnamese-food aligned, have a moderate class count, include cooked dishes plus ingredients/spices/food materials, and keep a high Vietnamese/common-Vietnamese class ratio.

```powershell
python ai-provider\dataset_v2\discover_roboflow_sources.py --pages 1 --out "_dataset_v2_reports\roboflow_universe_candidates.csv" --json-out "_dataset_v2_reports\roboflow_universe_candidates.json"
python ai-provider\dataset_v2\discover_kaggle_sources.py --top-per-query 12 --query "vietfood68" --query "vietnamese food object detection" --query "vietnamese food yolo" --query "food ingredient detection yolo" --out "_dataset_v2_reports\kaggle_targeted_candidates.csv" --json-out "_dataset_v2_reports\kaggle_targeted_candidates.json"
```

Keep the reviewed shortlist in `top_tier_dataset_candidates_2026-05-05.csv`. The shortlist separates `BACKBONE_AUDIT`, `BOOSTER_AUDIT`, and `INGREDIENT_SUPPLEMENT_AUDIT` lanes so ingredient-only sources cannot be mistaken for Vietnamese backbone sources. A source can move from metadata candidate to clean candidate only after raw audit, sample-grid review, class whitelist/mapping, and license decision. Roboflow/Kaggle metadata is only a first gate; it must not bypass raw label quality checks.

## Clean Candidate Gate

The first clean-build candidate set is intentionally smaller than the full
audited pool. Keep the source policy in:

```text
ai-provider/dataset_v2/clean_candidate_sources_2026-05-06.csv
```

The default clean lane includes only audited/cache-backed sources that passed
sample-grid review and can be filtered by an explicit taxonomy. Sources with
`include_in_default_clean=no` remain hold/cherry-pick lanes until a concrete
filter exists. `vietfood67` is marked `noncommercial_only`; it is excluded from
default production clean data unless `--include-noncommercial` is passed for a
private/non-commercial experiment.

Use the ASCII taxonomy seed for the first clean candidate build:

```text
ai-provider/dataset_v2/class_taxonomy.clean_candidate_2026-05-06.yaml
```

```powershell
python ai-provider\dataset_v2\build_clean_dataset.py --audit-json "_dataset_v2_reports\source_audit.json" --taxonomy "ai-provider\dataset_v2\class_taxonomy.clean_candidate_2026-05-06.yaml" --source-policy "ai-provider\dataset_v2\clean_candidate_sources_2026-05-06.csv" --out-dataset "_dataset_v2_work\clean_dataset" --out-reports "_dataset_v2_reports"
```

Do not add public Drive/gdown fallback paths to this build. Raw source material
must come from Kaggle inputs/cache or from Kaggle-mounted datasets, and local
downloads remain limited to reports, logs, and sample grids.

## Large Source Audit

Use this for the two sources that should not go through the small Drive cache path:

- `food_data_truongvo`: download the Roboflow YOLO export in Kaggle with the `ROBOFLOW_API_KEY` secret, then audit/cache only after audit succeeds.
- `vietfood67`: mount `thomasnguyen6868/vietfood68` directly as a Kaggle input, audit the extracted YOLO folder with a capped first pass, keep the `CC BY-NC-SA 4.0` license in reports, and do not raw-cache it.

The Kaggle VietFood67 mount has YOLO labels but no `data.yaml`. Keep its class names in `source_class_maps.yaml` and reference that file from `large_source_scope.2026-05-05.csv`; the audit report will keep `data_yaml_found=false` plus `external_class_map_used` so provenance remains visible.

```powershell
python ai-provider\dataset_v2\prepare_kaggle_packages.py pipeline-code --out-dir "_dataset_v2_pipeline_code_package"
python ai-provider\dataset_v2\kaggle_remote_orchestrator.py dataset --folder "_dataset_v2_pipeline_code_package" --message "Dataset V2 pipeline code with large source audit"
python ai-provider\dataset_v2\kaggle_remote_orchestrator.py prepare-kernel --kernel-metadata ai-provider\dataset_v2\kaggle_large_source_audit_kernel_metadata.json --out-dir "_dataset_v2_large_source_audit_kernel"
python ai-provider\dataset_v2\kaggle_remote_orchestrator.py push-kernel --folder "_dataset_v2_large_source_audit_kernel"
python ai-provider\dataset_v2\kaggle_remote_orchestrator.py output --kernel-id "hiuinhcng/eatfitai-dataset-v2-large-source-audit" --out-dir "_dataset_v2_reports\kaggle_large_source_audit"
```

Attach Kaggle Secret `ROBOFLOW_API_KEY` before saving/running this notebook. Do not paste or print the key in notebooks, logs, CSV, or reports.
Local `ROBOFLOW_API_KEY` is not inherited by Kaggle; add the same key through Kaggle notebook secrets and enable it for this notebook before `Save Version`.

The same kernel can also run the 2026-05-06 Roboflow top-tier audit scopes when
`roboflow_source_scope.phase1_2026-05-06.csv` or
`roboflow_source_scope.2026-05-06.csv` is present in the pipeline-code package.
Phase 1 is intentionally small and uses only known-ready exports. The full scope
is used for Roboflow-only candidates that passed metadata review but still need
raw audit/sample grids/cache before clean merge. The kernel polls Roboflow
export generation when the API returns `202` instead of failing early. Use this
lane only with `ROBOFLOW_API_KEY` attached to the Kaggle notebook.

## Kaggle-First Package Prep

Use this when the Drive raw zip folder is available locally through Drive for Desktop, connector download, or a one-time Colab bridge.

```powershell
python ai-provider\dataset_v2\prepare_kaggle_packages.py pipeline-code --out-dir "_dataset_v2_pipeline_code_package"
python ai-provider\dataset_v2\prepare_kaggle_packages.py raw-sources --raw-dir "G:\My Drive\EatFitAI-Training\datasets-raw" --manifest ai-provider\dataset_v2\source_decisions.public_review.csv --out-dir "_dataset_v2_raw_sources_package"
python ai-provider\dataset_v2\kaggle_remote_orchestrator.py dataset --folder "_dataset_v2_pipeline_code_package" --message "Dataset V2 pipeline code"
python ai-provider\dataset_v2\kaggle_remote_orchestrator.py dataset --folder "_dataset_v2_raw_sources_package" --message "Dataset V2 raw source zips"
python ai-provider\dataset_v2\kaggle_remote_orchestrator.py prepare-kernel --out-dir "_dataset_v2_raw_audit_kernel"
python ai-provider\dataset_v2\kaggle_remote_orchestrator.py push-kernel --folder "_dataset_v2_raw_audit_kernel"
```

The raw-sources package is for private audit only. Keep final source/license decisions in the generated reports before building a public or production training dataset.
Add `--fail-on-missing` only after all selected `DOWNLOAD_THEN_*` sources are present in the local Drive raw folder.

If the clean-build step runs in a new Kaggle session after raw audit reports are downloaded, pass the mounted raw dataset again so missing `extracted_path` values can be re-created:

```powershell
python ai-provider\dataset_v2\build_clean_dataset.py --audit-json "_dataset_v2_reports\source_audit.json" --taxonomy "_dataset_v2_reports\class_taxonomy.final.yaml" --raw-dir "_dataset_v2_work\raw_zips" --work-dir "_dataset_v2_work" --out-dataset "_dataset_v2_work\clean_dataset" --out-reports "_dataset_v2_reports"
```

Generated folders are intentionally ignored by git.

## Cloud-Only Drive To Kaggle

Use this when raw zips must stay off the local machine. Run the bridge in Google Colab, where Google Drive is mounted in the cloud and Kaggle receives a private raw-sources dataset from that cloud runtime.

```python
import os

os.environ["KAGGLE_API_TOKEN"] = "paste runtime token here"
```

```powershell
python ai-provider\dataset_v2\colab_cloud_bridge.py --wait
```

The bridge does all of these in cloud storage/runtime:

1. Mounts `/content/drive/MyDrive/EatFitAI-Training`.
2. Reads raw zips from `datasets-raw`.
3. Builds a private Kaggle raw-sources dataset while preserving `source_slug`, `package_path`, source decision, SHA256, and size in `raw_source_manifest.csv`.
4. Builds/versions the private Kaggle pipeline-code dataset.
5. Prepares and pushes the Kaggle raw-audit kernel.
6. If `--wait` is passed, downloads Kaggle kernel outputs to `dataset-v2-kaggle-outputs/raw-audit` in Drive.

Keep `--fail-on-missing` off until all `DOWNLOAD_THEN_*` sources have been downloaded into Drive. Quarantine and reject rows are skipped by default.

## OAuth Drive Direct To Kaggle

Use this when raw zips must stay off the local machine and Google Drive public download is blocked by quota. The Kaggle kernel reads the `RCLONE_DRIVE_CONF` Kaggle Secret, downloads Drive files with owner OAuth through rclone, audits them in `/tmp`, and writes only reports/sample grids to Kaggle output. It also uploads successfully audited small raw zips to the private Kaggle Dataset cache `hiuinhcng/eatfitai-dataset-v2-raw-audit-cache`.

Required Kaggle Secrets attached to the notebook:

- `RCLONE_DRIVE_CONF`
- `KAGGLE_API_TOKEN`

Kaggle secrets are notebook-scoped. A successful drive-secret smoke run does
not automatically enable the same secrets on the public-drive raw audit
notebook. If the report shows `drive_secret_unreachable`, open the target
notebook in Kaggle, enable both secrets from Add-ons -> Secrets, then Save
Version again.

Keep the raw cache private and use license `unknown` for the cache package because source licenses are mixed/unverified. Final clean datasets must remain private until the per-source license manifest is resolved.

```powershell
python ai-provider\dataset_v2\prepare_kaggle_packages.py pipeline-code --out-dir "_dataset_v2_pipeline_code_package" --public-drive-scope "ai-provider\dataset_v2\public_drive_source_scope.oauth_retry_2026-05-05.csv"
python ai-provider\dataset_v2\kaggle_remote_orchestrator.py dataset --folder "_dataset_v2_pipeline_code_package" --message "Dataset V2 pipeline code with public Drive manifest"
python ai-provider\dataset_v2\kaggle_remote_orchestrator.py prepare-kernel --kernel-metadata ai-provider\dataset_v2\kaggle_public_drive_raw_audit_kernel_metadata.json --out-dir "_dataset_v2_public_drive_raw_audit_kernel"
python ai-provider\dataset_v2\kaggle_remote_orchestrator.py push-kernel --folder "_dataset_v2_public_drive_raw_audit_kernel"
```

After the kernel finishes:

```powershell
python ai-provider\dataset_v2\kaggle_remote_orchestrator.py output --kernel-id "hiuinhcng/eatfitai-dataset-v2-public-drive-raw-audit" --out-dir "_dataset_v2_reports\kaggle_public_drive_raw_audit"
```

Do not use public Drive/gdown as a fallback when OAuth fails. Record the failure status (`drive_secret_missing`, `drive_secret_unreachable`, `drive_oauth_failed`, `rclone_install_failed`, or `resource_blocked_expected_size`) and stop that source.

Current reviewed shortlist after the 2026-05-05 OAuth audit is tracked in `source_shortlist.oauth_audit_2026-05-05.csv`. Sources marked `cached_missing_reaudit_needed` were audited in the earlier v4 public-Drive run but must be re-run through OAuth before a full cloud-only clean build can rely on the raw cache.

Use `public_drive_source_scope.cache_all_small_2026-05-05.csv` for the next cache pass. It intentionally contains all 19 non-deferred, non-quarantined small sources so the private cache dataset's latest version is complete. It excludes `vietfood67`, `food_data_truongvo`, quarantine rows, and missing-download rows.
