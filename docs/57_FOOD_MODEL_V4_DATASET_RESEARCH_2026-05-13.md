# EatFitAI Food Model V4 Dataset Research - 2026-05-13

## Decision

Do not spend GPU quota training V3 as the final model. V3 is only a clean
pipeline baseline. The next model worth training should be V4 Expanded.

Max-ceiling V4 target:

- Detection taxonomy: 300-360 classes.
- Aim point: about 340 classes.
- Hard stop: above 420 classes unless a manual taxonomy review removes
  weak/ambiguous labels.
- Max-ceiling dataset build cap: 260k images.
- Stretch cap after distribution passes: 320k images.
- Preserve the current 105 classes in the same order.
- Add every new class that passes source-specific gates, not just the first
  balanced 100 classes.
- Keep rejected/held classes out even if the class count target is not reached.

Why not jump straight to 500+ classes:

- Most large food datasets are image-classification datasets, not YOLO detection
  datasets with per-object boxes.
- Full-image pseudo boxes are useful only for single-dish images, and harmful for
  tray/component detection if used broadly.
- Kaggle GPU budget is 30h/week; one max-ceiling clean run is better than
  repeated noisy attempts, but the ceiling still has to respect visual
  separability, split coverage, and source quality.

## How Strong Public Systems Do It

Strong food-recognition pipelines usually combine several layers:

- Large classification taxonomy for broad dish knowledge.
- Detection or segmentation labels for multi-food images.
- Nutrition/portion datasets for calorie grounding, not necessarily for class
  expansion.
- Strict source-specific audits, not one global threshold.
- Hierarchical classes: dish -> protein/preparation -> ingredient/component.
- Long-tail handling: hold rare classes until there are enough images and valid
  split coverage.

Relevant public references checked:

- Food-101: 101 classes and 101,000 images; useful scale reference but
  classification-only and intentionally noisy train labels.
- VIREO Food-172: 172 categories and roughly 110k images with ingredients.
- ISIA Food-500: 500 food categories and roughly 400k images.
- Food2K: 2,000 categories and more than 1M images for recognition-scale
  research.
- FoodSeg103: 103 food ingredient/semantic classes for segmentation.
- Nutrition5k: nutrition/portion dataset; useful for calorie grounding, not a
  direct class-count expansion source.
- Food Recognition Benchmark 2022 / MyFoodRepo: real-world multi-food
  detection/segmentation style data; strongest pattern match for EatFitAI.

## Optimal Architecture For EatFitAI

Use a hybrid expansion, not a single all-purpose label dump:

1. YOLO11m/YOLO11l detector for 300-360 visually reliable food classes.
2. Separate nutrition mapping table that maps visually distinct classes to
   calorie profiles.
3. Optional later classifier/embedding model for fine-grained dish names beyond
   YOLO's reliable detection taxonomy.

This avoids making YOLO distinguish classes that are not visually separable,
while still supporting more food names in the app.

## V4 Source Strategy

Priority A - Vietnamese class expansion:

- `karos2504/100-vietnamese-food`
  - Apache-2.0.
  - Classification folder layout.
  - Priority audit because it can add Vietnamese dish classes with permissive
    license.
  - Use only single-dish/full-frame style images as pseudo boxes.

- `meowluvmatcha/vnfood-30-100`
  - CC-BY-NC-SA-4.0.
  - Classification folder layout.
  - Good class coverage but noncommercial license; private/noncommercial lane
    only unless license constraints are acceptable.

- `phantrihieu/vnfood-combined-dataset`
  - CC-BY-NC-SA-4.0.
  - VQA/image pool.
  - Useful for class discovery and samples, not direct YOLO without adapter.

- `quandang/vietnamese-foods`
  - CC-BY-NC-SA-4.0.
  - 30-class Vietnamese backbone.
  - Likely duplicate-heavy with existing sources; use for missing/weak classes
    only.

Priority B - real-world multi-food/segmentation:

- `awsaf49/food-recognition-2022-dataset`
  - CC0-1.0.
  - MyFoodRepo/Food Recognition style image pool.
  - Strong candidate for real-world multi-food generalization if annotations can
    be converted/mapped.

- `fontainenathan/foodseg103`
  - Apache-2.0.
  - Semantic segmentation.
  - Useful for ingredient/component boxes after mask-to-box conversion.

Priority C - ingredient/object boosters:

- `mochamadfaisalakbar/nutrition-dataset-yolo`
  - MIT.
  - YOLO layout.
  - Low downloads/usability, but direct detection format; audit first.

- `kapturovalexander/fruits-by-yolo-fruits-detection`
  - CC-BY-4.0.
  - Direct YOLO fruit detection.
  - Use only if fruit classes remain important for calories/app use.

- `rajeevpaudel1/nepali-food-image-dataset`
  - CC0-1.0.
  - Object detection, cuisine mismatch.
  - Use only overlapping proteins/ingredients, not dish taxonomy.

Hold or reject:

- `rkuo2000/uecfood256`
  - Unknown license in Kaggle metadata.
  - Useful research reference, but hold until license is clear.

- `dataclusterlabs/indian-food-image-dataset`
  - License marked `copyright-authors`.
  - Reject for default training.

## V4 Class Count Plan

Best target for one max-ceiling train:

- Minimum worth spending GPU quota: 300 classes.
- Aim point: 340 classes.
- Upper bound without manual review: 360 classes.
- Above 420 classes: hard stop and taxonomy review before any GPU train.
- If fewer than 300 classes pass audit, do not train; find more data first.

Per-class gates:

- Existing 105 classes: preserve.
- New class from true detection/segmentation source:
  - accept: >= 350 usable images or >= 500 instances.
  - priority_accept: >= 800 usable images.
- New class from classification source converted to pseudo boxes:
  - accept: >= 700 images after single-dish filtering.
  - priority_accept: >= 1,200 images.
- Valid/test gate:
  - at least 30 valid images and 15 test images for priority new classes.
  - no new class may exist only in train.

Class design rules:

- Split when cooking method changes calories and is visually learnable:
  - `ga_luoc`, `ga_chien`, `ga_nuong`.
  - `heo_quay`, `thit_kho_trung`, `suon_nuong`.
  - `ca_kho_to`, `ca_chien`, `ca_nuong`.
- Hold when label is too broad:
  - `rau`, `thit`, `mon_an`, `food`, `dish`.
- Hold when visual difference is weak without context:
  - sauce-only variations.
  - regional names that look identical to existing dishes.

## Next Implementation Steps

1. Let Clean Build V3 finish, but do not train V3.
2. Create a V4 source audit kernel that mounts the priority datasets above.
3. Add adapters:
   - classification ImageFolder -> single-dish pseudo-box audit.
   - semantic mask -> bbox audit.
   - YOLO direct -> existing audit path.
4. Generate `class_candidates_v4.csv`.
5. Build `class_taxonomy.clean_v4_expanded_YYYY-MM-DD.yaml`.
6. Stop if final class count is below 300.
7. Stop above 420 until taxonomy review removes weak/ambiguous classes.
8. Only ask for GPU train after V4 dataset passes.

## Current Recommendation

The optimal next target is:

- V4 taxonomy: max-ceiling 300-360 classes, aim around 340.
- V4 clean dataset: 260k images first max build, stretch to 320k only if
  distribution is still clean.
- One GPU train only after V4 build passes.
- Prefer YOLO11m if the 30h quota is tight; use YOLO11l only if the estimated
  runtime fits the remaining quota or the user explicitly chooses to spend more.

## Current Implementation Status

Implemented local V4 candidate scoring after pulling usable V4 source-audit
artifacts. The latest full-audit Kaggle version later exceeded Kaggle's max
execution duration, so do not treat the full audit kernel as the next job to
rerun.

Generated artifacts:

- `ai-provider/dataset_v2/mine_clean_v4_candidates.py`
- `ai-provider/dataset_v2/clean_v4_candidate_scorecard_2026-05-13.csv`
- `ai-provider/dataset_v2/clean_v4_candidate_summary_2026-05-13.json`
- `ai-provider/dataset_v2/class_taxonomy.clean_v4_expanded_2026-05-13.yaml`
- `ai-provider/dataset_v2/clean_candidate_sources_v4_2026-05-13.csv`

Default/commercial-safe scoring result after pulling the usable V4 source audit
output on 2026-05-14:

- Latest Kaggle status: `hiuinhcng/eatfitai-v4-source-audit`
  `CANCEL_ACKNOWLEDGED`.
- Failure message: exceeded Kaggle's max allowed execution duration.
- Root cause: the full audit mounted too many heavyweight broad sources,
  including Food41/ChineseFoodNet/large global image pools.
- Output pulled to
  `_dataset_v2_reports/kaggle_v4_source_audit_latest/_eatfitai_v4_source_audit_reports/`.
- Base classes: 126, using Clean V3 Expanded as the base taxonomy.
- Accepted new classes: 42.
- Final class count if applied: 168.
- Decision status: `collect_more_v4_classes_before_gpu`.
- Decision counts: 69 existing, 42 accepted/priority accepted, 5 generic
  bucket holds, 39 manual nutrition-mapping holds, 72 more-data holds, 56
  targeted Vietnamese collection holds, 101 private/license holds, 784 rejects.

Private/noncommercial what-if scoring result after V4 source audit version 4:

- Accepted new classes: 43.
- Final class count if applied: 148.
- Still below the 300-class minimum to spend GPU.

Completed V4 adapter improvements:

- Food Recognition / COCO-style annotation categories now count annotation
  instances and unique images per category.
- FoodSeg103 semantic masks now produce class candidates from grayscale mask
  ids, with train/test split counts.
- Beverage, sauce-only, and condiment labels such as `water`, `coffee`,
  `wine`, `sauce`, `jam`, `honey`, and `butter` are held for nutrition mapping
  instead of entering the detector taxonomy.
- Numeric category ids from detection sources are rejected before taxonomy
  append.
- Common Food Recognition/FoodSeg naming variants are remapped before scoring:
  examples include `tomato_raw -> tomato`, `carrot_raw -> carrot`,
  `strawberries -> strawberry`, and `orange_orange_fruit -> orange`.
- Permissive Vietnamese dish candidates with at least 180 eligible images are
  marked `hold_targeted_collection` instead of being treated as final rejects.

Decision:

- Do not push Clean Build V4 yet.
- Do not run YOLO11m V4 training yet.
- Do not rerun the full source audit kernel as-is.
- The next task is a smaller CPU-only targeted Vietnamese source audit, then
  rerun V4 scoring against the combined candidate set.
- Manual promotion of visually strong held classes should happen only after the
  extra-source pass, because the current 168-class result is still far below the
  300-class minimum GPU gate.

2026-05-14 follow-up after the full-audit timeout:

- Added checkpoint/time-guard output to `kaggle_v4_source_audit_kernel.py`.
- Added targeted source manifest
  `clean_v4_targeted_vietnamese_source_candidates_2026-05-14.csv`.
- Added CPU-only targeted kernel
  `hiuinhcng/eatfitai-v4-targeted-vietnamese-source-audit`.
- Targeted kernel mounts only Vietnamese follow-up sources and avoids
  Food41/ChineseFoodNet/global heavy sources.
- Targeted kernel version 1 failed because Kaggle executed from `/kaggle/src`
  and the entrypoint imported `kaggle_v4_source_audit_kernel` before adding the
  pipeline-code folder to `sys.path`.
- Targeted kernel version 2 fixes the isolated-entrypoint import path and is
  running on Kaggle.
- Targeted kernel version 2 completed, but did not unlock new accepted classes:
  5/5 sources audited, 52 candidate rows, 8,053 candidate images. VietFood67
  mounted 171,619 images/label text files but produced `no_category_names_found`
  because the Kaggle package lacks a bundled class-id map.
- Targeted kernel version 3 changed VietFood67 to `yolo_detection`, but still
  lacked class names because the source has YOLO labels without `data.yaml`.
- Added `vietfood67_class_names_2026-05-14.yaml` from the upstream
  `nvhnam/FoodDetector` class list linked by the Kaggle metadata.
- Added YOLO fallback for mounted datasets with `images/labels` split folders
  and an external class map.
- Targeted kernel version 4 is running on Kaggle. It should confirm VietFood67
  as `yolo_detection` with the external class map before any taxonomy gate uses
  it.
- Targeted kernel version 4 completed successfully:
  - 5/5 targeted sources audited, 0 missing mounts.
  - 120 candidate rows, 669,399 candidate images.
  - Audit modes: 1 YOLO detection, 2 annotation/file-pool, 2 classification
    image-folder.
  - VietFood67 audited as `yolo_detection` with 68 classes, 171,619 images,
    171,619 label files, and `data_yaml_missing;external_class_map_used`.
- Combined V4 audit after targeted version 4:
  - 31 source rows, 27 audited, 2 missing mounts.
  - 2,314 candidate class rows.
  - 1,462,719 total candidate images.
- Default/commercial-safe V4 gate after targeted version 4:
  - Base classes: 126.
  - Accepted new classes: 42.
  - Final class count if applied: 168.
  - Status: `collect_more_v4_classes_before_gpu`.
- Private/noncommercial what-if gate after targeted version 4:
  - Accepted new classes: 52.
  - Final class count if applied: 178.
  - Status: `collect_more_v4_classes_before_gpu`.
- VietFood67 taxonomy impact:
  - 63/68 classes already map to existing base classes.
  - `rau` is held as a generic bucket label.
  - `con_nguoi`, `hamburger`, `pho_mai`, and `salad` are rejected by
    reject aliases.
  - No VietFood67 class is appended as a new class; the source is a strong
    bbox/data booster for private/noncommercial lanes, not a class-expansion
    source.
- The targeted Vietnamese audit automation was deleted after completion.
- Old automation `v4-source-audit-kaggle-follow-up` was removed because it
  pointed to the canceled full-audit kernel.
- New automation `v4-targeted-vietnamese-audit-follow-up` checks the targeted
  CPU job every 30 minutes.
- Validation: `python -m pytest ai-provider/tests/test_dataset_v2_v4_source_audit.py ai-provider/tests/test_dataset_v2_clean_v4_candidate_mining.py -q`
  passed with 20 tests and 2 subtests.

2026-05-14 class-expansion follow-up after VietFood67 proved mostly overlap:

- Research conclusion: the next class-count jump needs broader prepared-dish
  sources, not more Vietnamese overlap alone. The current gate is still 168
  public-safe classes / 178 private-lane classes, both below the 300-class
  minimum for spending GPU.
- Added audit adapters:
  - `classification_csv` for Kaggle/AIcrowd-style CSV labels such as
    `train_img.csv`.
  - `uecfood256_bbox` for UECFood `category.txt` plus per-class `bb_info.txt`.
  - Numeric image-folder class mapping via external class maps, needed for
    CNFood-241-style folders such as `000`, `001`, ...
  - `dataset.yaml` / `dataset.yml` support for YOLO sources that do not use
    the exact `data.yaml` filename.
- Added class maps:
  - `cnfood241_class_names_2026-05-14.yaml` with 241 English dish labels.
  - `uecfood256_class_names_2026-05-14.yaml` with 256 UEC category labels.
- Added class-expansion manifest
  `clean_v4_class_expansion_source_candidates_2026-05-14.csv`.
- Audit lanes in that manifest:
  - Public/default candidates: `bjoernjostein/food-classification`
    (CC0 CSV, 61 classes), `raahimshah/desi-food-dataset-annotated`
    (MIT YOLO), `nikolasgegenava/popular-street-foods` (MIT image-folder).
  - Private/noncommercial class-count ceiling candidate:
    `zachaluza/cnfood-241` (CC BY-NC 3.0, 241 classes, 191k images).
  - Audit-only/license-blocked reference: `rkuo2000/uecfood256`
    (256-class bbox metadata, Kaggle license unknown).
  - Quality/license holds: `patzer0/16-famous-chinese-dishes` has a Kaggle
    Apache tag but description warns about possible copyright restrictions;
    `jiezh2/common-chinese-food` is only five classes and described as 32x32
    augmented images.
  - Adapter hold: `rock3yu/dimsum50-0-1` is promising, but the Kaggle file list
    showed flat images without a proven label map, so it remains out of the
    audit kernel until mapping is proven.
- Published pipeline-code dataset version:
  `hiuinhcng/eatfitai-dataset-v2-pipeline-code`, message
  `v4 class expansion CPU audit adapters maps and manifest`.
- Pushed CPU-only Kaggle kernel:
  `hiuinhcng/eatfitai-v4-class-expansion-source-audit`.
  - GPU disabled.
  - Timeout set to 32,400 seconds.
  - Initial status after push: `RUNNING`.
- Created heartbeat automation `v4-class-expansion-audit-follow-up` to check
  every 30 minutes, download output when complete, rerun public/private V4
  mining, and report whether the class count reaches the 300-class GPU gate.
- Validation: `python -m pytest ai-provider/tests/test_dataset_v2_v4_source_audit.py ai-provider/tests/test_dataset_v2_clean_v4_candidate_mining.py -q`
  passed with 31 tests and 3 subtests.

2026-05-14 class-expansion audit result and clean-build gate:

- `hiuinhcng/eatfitai-v4-class-expansion-source-audit` completed successfully.
- Audit output showed 8 configured sources, 7 audited sources, 0 missing
  mounts, 584 candidate class rows, and 243,986 candidate images.
- Combined V4 audit after replacing duplicate source refs now has 38 sources,
  34 audited sources, 2,898 candidate class rows, and 1,706,705 candidate
  images.
- Public-safe mining result:
  - Base classes: 126.
  - Accepted new classes: 49.
  - Final public-safe class count if applied: 175.
  - Gate status: still below the 300-class GPU threshold.
- Private/noncommercial mining result:
  - Base classes: 126.
  - Accepted new classes: 184.
  - Final private-lane class count if applied: 310.
  - Gate status: eligible for CPU clean-build candidate generation, not yet
    eligible for GPU training until the candidate dataset passes strict
    validation.
- Fixed source-policy scoring so accepted class-expansion sources are capped by
  either internal source slug or Kaggle `dataset_ref`; this prevents accepted
  sources such as CNFood-241 from being accidentally capped to zero.
- Added CPU clean-build adapters in
  `ai-provider/dataset_v2/build_clean_dataset_v4_from_kaggle_sources.py` for:
  YOLO detection sources, image-folder classification, CSV classification,
  COCO annotation pools, and FoodSeg-style mask-to-bbox conversion.
- Added CPU-only Kaggle clean-build kernel
  `hiuinhcng/eatfitai-dataset-v2-clean-build-v4-class-expansion`.
  - GPU disabled.
  - Max images target: 260,000 candidate images before validation and source
    caps.
  - Uses the private/noncommercial 310-class taxonomy and source policy.
  - UECFood256 remains excluded because its Kaggle license is unknown.
- Published pipeline-code dataset version with the clean-build adapters and
  kernel files, then pushed clean-build kernel version #1.
- Current status after push: `RUNNING`.
- Created heartbeat automation `v4-clean-build-class-expansion-follow-up` to
  check every 30 minutes, download outputs after completion, inspect summary,
  manifest, validation, inventory, and issue files, then decide the next
  CPU-only quality gate.
- Validation: `python -m pytest ai-provider/tests/test_dataset_v2_clean_v4_candidate_mining.py ai-provider/tests/test_dataset_v2_v4_source_audit.py -q`
  passed with 32 tests and 5 subtests.

2026-05-15 clean-build V4 completion and YOLO11m train handoff:

- Clean-build kernel `hiuinhcng/eatfitai-dataset-v2-clean-build-v4-class-expansion`
  completed after the validator/layout and label-sanitization fixes.
- Final CPU hard gate:
  - Images: 208,640.
  - Classes: 310.
  - Train/valid/test images: 177,433 / 20,785 / 10,422.
  - Validation hard counters: all zero.
  - `validation.hard_gate_passed`: `true`.
- Sanitization performed before final validation:
  - Dropped 110 out-of-bounds bbox rows.
  - Dropped 299 duplicate exact label rows.
  - Skipped 78 images that became empty after sanitization.
- Local pipeline fixes now preserve:
  - `data.yaml` image-first split layout support in
    `validate_clean_dataset.py`.
  - V4 label sanitization in
    `build_clean_dataset_v4_from_kaggle_sources.py`.
- Created V4 train handoff:
  - `kaggle_yolo11m_clean_v4_class_expansion_train.py`.
  - `kaggle_yolo11m_clean_v4_class_expansion_train_metadata.json`.
  - The train script uses the mounted clean-build output directory directly
    and creates a writable `/tmp` symlink view so YOLO can build caches without
    copying the 17GB dataset.
  - Fine-tune mode remains the default from
    `hiuinhcng/eatfitai-yolo11m-clean-v1-checkpoint`.
- Validation:
  `.\ai-provider\.venv\Scripts\python.exe -m unittest ai-provider\tests\test_dataset_v2_pipeline_handoffs.py ai-provider\tests\test_dataset_v2_v4_source_audit.py ai-provider\tests\test_dataset_v2_yolo11m_train_handoff.py`
  passed with 72 tests.
- Pushed GPU train kernel:
  `hiuinhcng/eatfitai-yolo11m-clean-v4-class-expansion`.
  - Version: 1.
  - Initial status after push: `RUNNING`.
  - Follow-up automation `v4-yolo11m-train-follow-up` checks status, downloads
    only compact artifacts/logs, and gates promotion on golden/runtime eval.

2026-05-15 train version 1 failure and artifact-build fix:

- YOLO11m V4 train version 1 failed before training.
- Root cause:
  - GPU was available: T4 x2.
  - Failure occurred in `extract_dataset()`.
  - `kernel_sources` did not expose the clean-build V4 output directory as a
    readable dataset under `/kaggle/input`.
  - `kaggle kernels files hiuinhcng/eatfitai-dataset-v2-clean-build-v4-class-expansion`
    only showed `_output_.zip` at 888 bytes, so no trainable dataset archive
    was mounted.
- Added a dedicated CPU artifact kernel:
  - `kaggle_clean_build_v4_class_expansion_train_artifact_kernel.py`.
  - `kaggle_clean_build_v4_class_expansion_train_artifact_kernel_metadata.json`.
  - Kaggle id: `hiuinhcng/eatfitai-v4-clean-train-artifact`.
  - Builds the clean dataset under `/tmp` and writes
    `eatfitai_dataset_v2_clean_v4_class_expansion_candidate.zip` plus reports
    to `/kaggle/working`.
- Updated the YOLO11m V4 train metadata to use
  `hiuinhcng/eatfitai-v4-clean-train-artifact` as its kernel source.
- Validation:
  `.\ai-provider\.venv\Scripts\python.exe -m unittest ai-provider\tests\test_dataset_v2_v4_source_audit.py ai-provider\tests\test_dataset_v2_yolo11m_train_handoff.py`
  passed with 50 tests.
- Pushed CPU artifact kernel version 1:
  `hiuinhcng/eatfitai-v4-clean-train-artifact`.
  - Current status after push: `RUNNING`.
  - Do not push YOLO11m train again until
    `kaggle kernels files hiuinhcng/eatfitai-v4-clean-train-artifact` confirms
    the V4 clean dataset zip exists and has non-trivial size.

2026-05-15 artifact verification and YOLO11m train version 2 push:

- CPU artifact kernel `hiuinhcng/eatfitai-v4-clean-train-artifact` completed.
- Kaggle output now includes:
  - `eatfitai_dataset_v2_clean_v4_class_expansion_candidate.zip`.
  - `eatfitai_dataset_v2_clean_build_v4_class_expansion_train_artifact_reports.zip`.
  - compact report files such as `clean_build_v4_result.json`.
- Downloaded only compact report files locally and verified:
  - Images: 208,640.
  - Classes: 310.
  - Train/valid/test images: 177,433 / 20,785 / 10,422.
  - Validation hard counters: all zero.
  - `validation.hard_gate_passed`: `true`.
- Local validation before push:
  `python -m unittest ai-provider\tests\test_dataset_v2_yolo11m_train_handoff.py`
  passed with 25 tests.
- Local validation before push:
  `python -m unittest ai-provider\tests\test_dataset_v2_v4_source_audit.py`
  passed with 25 tests.
- Pushed GPU train kernel
  `hiuinhcng/eatfitai-yolo11m-clean-v4-class-expansion`.
  - Version: 2.
  - Kaggle URL:
    `https://www.kaggle.com/code/hiuinhcng/eatfitai-yolo11m-clean-v4-class-expansion`.
  - Status immediately after push: `RUNNING`.
- Next gate:
  wait for train version 2 to complete, then download compact outputs/logs and
  check `last.pt`, `best.pt`, `best.onnx`, `results.csv`, `args.yaml`, and
  `yolo11m_resume_manifest.json` before any promotion or runtime eval.

2026-05-17 train version 2 duration failure and V2-style resume correction:

- Kaggle status for `hiuinhcng/eatfitai-yolo11m-clean-v4-class-expansion`
  returned `CANCEL_ACKNOWLEDGED`.
- Failure message: exceeded Kaggle's max allowed execution duration.
- `kaggle kernels files` returned no train outputs at the time of the initial
  check, but this is not sufficient proof that the timed-out version had no
  downloadable output. The earlier V1/V2 lane showed that a timed-out Kaggle
  run can still expose usable checkpoint files through output download/probe.
- The clean V4 artifact source remains valid:
  `hiuinhcng/eatfitai-v4-clean-train-artifact` is `COMPLETE` and exposes the
  clean candidate plus compact reports.
- Correct next step: keep the V4 train target at 150 epochs, as in the V2
  pattern, and after any timeout first probe/download outputs. If
  `last.pt`/`best.pt`/`results.csv` are available, package them as a dedicated
  V4 checkpoint dataset and mount that dataset on the next resume run.
- A short 30-epoch version 5 was pushed as a checkpoint-pass experiment, then
  canceled by the user before completion. Do not treat version 5 as the V4
  training strategy.
- Output probe for the canceled version 5 confirmed:
  - Clean V1 checkpoint was discovered and mounted correctly.
  - Training started on V4 data with T4 x2.
  - The run was canceled during epoch 1, before the epoch-end checkpoint sync,
    so no `last.pt`/`best.pt`/`results.csv` were available from version 5.
- Local validation:
  `python -m unittest ai-provider\tests\test_dataset_v2_yolo11m_train_handoff.py`
  passed with 25 tests.
- Restored the V4 train default back to 150 epochs and pushed GPU train version
  6:
  `hiuinhcng/eatfitai-yolo11m-clean-v4-class-expansion`.
  - Status immediately after push: `RUNNING`.
- Next gate:
  run the 150-epoch V4 train from the mounted Clean V1 checkpoint. If it times
  out, immediately probe/download output and build a V4 checkpoint dataset
  before pushing any further resume run.

## Source Links

- Food-101 / ETH Zurich via Hugging Face:
  https://huggingface.co/datasets/ethz/food101
- VIREO Food-172:
  https://fvl.fudan.edu.cn/dataset/vireofood172/list.htm
- ISIA Food-500:
  https://arxiv.org/abs/2008.05655
- Food2K:
  https://arxiv.org/abs/2103.16107
- FoodSeg103:
  https://arxiv.org/abs/2105.05409
- FoodInsSeg:
  https://github.com/jamesjg/FoodInsSeg
- Nutrition5k:
  https://github.com/google-research-datasets/Nutrition5k
- Food Recognition Benchmark / MyFoodRepo-273:
  https://www.frontiersin.org/journals/nutrition/articles/10.3389/fnut.2022.875143/full
