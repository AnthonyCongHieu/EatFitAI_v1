# YOLO11 Clean V3 Expanded Pipeline Checklist - 2026-05-13

## Purpose

Clean V3 expands beyond the current 105-class YOLO11 taxonomy without guessing.
It mines candidate classes from already audited labels, accepts only classes that
pass strict quality gates, builds a larger dataset, and trains/evaluates once the
data evidence is strong enough.

## Phase 0 - Baseline Lock

- [x] Keep YOLO11m Clean V1 as rollback/evidence baseline.
- [x] Keep Clean V2 Kaggle build running as a separate baseline.
- [x] Do not reorder the existing 105 classes.
- [x] Do not promote any model from public diagnostic seed alone.

Pass gate:

- Baseline artifacts are known.
- Public diagnostic eval is recorded.
- Existing 105-class order is preserved.

Fail gate:

- Current model artifact or class order is ambiguous.
- Generated reports contain mojibake in class names.

## Phase 1 - Candidate Mining

- [x] Read latest `class_candidates.csv`.
- [x] Read latest `source_audit.csv/json`.
- [x] Read base taxonomy.
- [x] Aggregate raw labels into normalized candidate class names.
- [x] Keep provenance: raw label, source slug, images, instances.
- [x] Mark whether the candidate already exists in the 105-class taxonomy.
- [x] Collapse parenthetical translations such as `Heo quay (Roast pork)`.
- [x] Collapse source prefixes such as `ye_bun_cha_ca`.
- [x] Treat base taxonomy aliases and `reject_aliases` as hard gates.

Pass gate:

- Candidate report exists.
- No empty candidate class names.
- No mojibake or replacement characters in accepted/held class names.

Fail gate:

- Candidate report cannot trace class back to sources.
- Candidate names are generated from model predictions instead of raw audited labels.

## Phase 2 - Strict Candidate Quality Gate

Candidate outcomes:

- `accept`: can enter V3 taxonomy.
- `priority_accept`: can enter V3 and should be emphasized in source policy.
- `hold_more_data`: useful but not enough evidence.
- `merge_to_existing`: visually or nutritionally too close to an existing class.
- `reject`: unsafe/noisy/not useful.

Acceptance thresholds implemented in `clean_v3_candidate_policy.yaml`:

- Existing class: always preserved.
- New class minimum for hold: 80 images.
- New class minimum for accept: 500 images.
- Priority accept: 800 images or more.
- Preferred source count: 2 or more.
- Single-source accept allowed only for high-value Vietnamese/preparation classes with clear labels.
- Must have nutrition value or preparation-specific calorie difference.

Reject immediately:

- Person/human labels.
- Packaging/product-only labels.
- Generic non-food classes.
- Broken placeholder labels such as `label`, `-`, `'`.
- Tiny classes below 80 images unless manually whitelisted for later collection.

## Phase 3 - Taxonomy Generation

- [x] Copy base 105-class taxonomy.
- [x] Append accepted new classes at the end.
- [x] Keep aliases under each canonical class.
- [x] Keep parent/fallback mapping in the scorecard.
- [x] Generate a class-count summary.

Current strict-gate result:

- Base classes: 105.
- Accepted new classes: 21.
- Generated taxonomy: `class_taxonomy.clean_v3_expanded_2026-05-13.yaml`.
- Final class count if applied: 126.
- Decision: pass for a first V3 quality build, but not enough for the 180-250 strong-expansion target.
- Next requirement for strong expansion: audit additional Kaggle/raw sources before adding more classes.
- Kaggle source discovery report: `clean_v3_external_source_candidates_2026-05-13.csv`.

Pass gate:

- Existing class order unchanged.
- New classes appended only.
- Final class count target: 180-250.
- Any count above 260 requires manual review before Kaggle build.
- A first-pass build below 180 is allowed only as a quality baseline, not as the final expanded model.

Fail gate:

- Existing class index changes.
- Duplicate canonical names appear.
- A held/rejected class enters taxonomy.

## Phase 4 - Dataset Build Gate

Start targets:

- First V3 dataset cap: 80k images.
- Increase to 120k/150k only after class distribution passes.

Prepared artifacts:

- [x] `clean_candidate_sources_v3_2026-05-13.csv`.
- [x] `kaggle_clean_build_v3_kernel.py`.
- [x] `kaggle_clean_build_v3_kernel_metadata.json`.
- [x] Local Kaggle folder: `_dataset_v2_clean_build_v3_kernel`.
- [x] Pipeline-code dataset versioned on Kaggle with V3 assets.
- [ ] Push Clean Build V3 only after Clean Build V2 leaves `RUNNING`.

Hard pass:

- `hard_gate_passed=true`.
- `malformed_rows=0`.
- `class_out_of_range_rows=0`.
- `bbox_out_of_bounds_rows=0`.
- `image_open_failed=0`.
- No empty train/valid/test split.
- Accepted new classes appear in train and valid.

Fail:

- Missing source cache.
- Class distribution shows accepted classes absent from valid.
- Large duplicate/image-open/label errors.

## Phase 5 - Smoke Train Gate

- [ ] Run short YOLO11 smoke train on V3 dataset.
- [ ] Confirm dataset loads.
- [ ] Confirm class count matches taxonomy.
- [ ] Confirm no class-index mismatch.

Pass:

- Smoke train starts and completes.
- Results file exists.

Fail:

- Data YAML mismatch.
- Class count mismatch.
- GPU/runtime dependency failure.

## Phase 6 - Full YOLO11m V3 Train Gate

- [ ] Use YOLO11m first.
- [ ] Fine-tune from best prior checkpoint without `resume=True`.
- [ ] Keep V3 run name and kernel separate from V1/V2.
- [ ] Export `best.onnx`.

Pass:

- `last.pt`, `best.pt`, `best.onnx`, `results.csv`, `args.yaml` are available.
- Training did not merely re-export a completed old checkpoint.

Fail:

- `last_recorded_epoch` comes from a prior run without new training.
- ONNX export missing.

## Phase 7 - Evaluation Gate

- [ ] Run public diagnostic seed eval.
- [ ] Run real app golden eval when images are available.
- [ ] Compare against YOLOv8 rollback and YOLO11m Clean V1/V2.

Promotion target:

- `new_hit_rate >= 0.72`.
- `new_empty_image_rate <= 0.08`.
- `regression_rate <= 0.10`.
- Not worse than rollback by more than `0.02`.

Fail:

- Public seed improves but real golden images regress.
- Hit-rate stays low due to missed high-priority classes.

## Phase 8 - Decision

- [ ] Promote V3 only if golden/runtime gates pass.
- [ ] If V3 fails from missing data, collect targeted datasets for held classes.
- [ ] If V3 fails from capacity after data gates pass, evaluate YOLO11l.
- [ ] Do not expand class count again until error report explains the gap.
