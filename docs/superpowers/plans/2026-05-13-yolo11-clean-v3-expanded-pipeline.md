# YOLO11 Clean V3 Expanded Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an end-to-end YOLO11 Clean V3 Expanded pipeline that mines candidate classes, gates them strictly, builds a larger dataset only from passing classes, then trains/evaluates without repeated guess-and-check cycles.

**Architecture:** Keep class discovery, class acceptance, dataset build, Kaggle execution, and golden/runtime evaluation as separate gates. Existing 105 YOLO classes stay stable; V3 appends accepted new classes after quality checks. Kaggle remains the heavy build/train runtime, while local scripts own deterministic reports and stop/go decisions.

**Tech Stack:** Python, CSV/JSON/YAML, existing Dataset V2 Kaggle orchestrator, Ultralytics YOLO11m, Kaggle API.

---

## Files

- Create: `docs/56_YOLO11_CLEAN_V3_EXPANDED_PIPELINE_CHECKLIST_2026-05-13.md`
  - Human checklist for phase gates, pass/fail thresholds, and artifacts.
- Create: `ai-provider/dataset_v2/mine_clean_v3_candidates.py`
  - Reads `class_candidates.csv`, source audit reports, current taxonomy, and writes candidate scorecards.
- Create: `ai-provider/dataset_v2/clean_v3_candidate_policy.yaml`
  - Strict thresholds for accepting, holding, or rejecting candidate classes.
- Create: `ai-provider/dataset_v2/clean_v3_seed_classes.yaml`
  - Nutrition-relevant target hints for Vietnamese dishes and preparation-specific classes.
- Create: `ai-provider/dataset_v2/clean_v3_external_source_candidates_2026-05-13.csv`
  - Kaggle API discovery shortlist for sources that can fill the class-count gap after strict local gating.
- Create: `ai-provider/tests/test_dataset_v2_clean_v3_candidate_mining.py`
  - Unit tests for candidate scoring, parent mapping, pass/hold/reject routing, and taxonomy append safety.
- Create after local gates:
  - `ai-provider/dataset_v2/class_taxonomy.clean_v3_expanded_2026-05-13.yaml`
  - `ai-provider/dataset_v2/clean_candidate_sources_v3_2026-05-13.csv`
  - `ai-provider/dataset_v2/kaggle_clean_build_v3_kernel.py`
  - `ai-provider/dataset_v2/kaggle_clean_build_v3_kernel_metadata.json`
  - `ai-provider/dataset_v2/kaggle_yolo11m_clean_v3_train.py`
  - `ai-provider/dataset_v2/kaggle_yolo11m_clean_v3_train_metadata.json`

## Task 1: Checklist And Gate Documentation

- [x] Write this implementation plan.
- [x] Write the public checklist document with phases:
  - Phase 0: Baseline status.
  - Phase 1: Candidate mining.
  - Phase 2: Candidate acceptance gate.
  - Phase 3: Taxonomy/source-policy generation.
  - Phase 4: Dataset build gate.
  - Phase 5: Smoke train gate.
  - Phase 6: Full train gate.
  - Phase 7: Golden/runtime evaluation gate.
  - Phase 8: Promote/iterate decision.
- [x] Include exact pass/fail thresholds:
  - Existing 105 classes remain in order.
  - New class must have at least 80 images for hold, 500 images for accept, and 800 images for priority accept.
  - New class should appear in at least 2 sources, except manually whitelisted high-value Vietnamese dish classes.
  - Reject classes with packaging/product-only labels, person/non-food labels, broken labels, or no nutrition value.
  - V3 target class count after gate: 180-250 classes, not all candidates.
  - V3 dataset image cap starts at 80k, then 120k/150k only after distribution report passes.

## Task 2: Candidate Mining Tests

- [x] Add tests in `ai-provider/tests/test_dataset_v2_clean_v3_candidate_mining.py`.
- [x] Test that preparation-specific labels such as `ga-chien` and `chicken breast` normalize into stable ASCII candidate IDs.
- [x] Test that current 105 classes are recognized as existing and not duplicated.
- [x] Test base aliases and `reject_aliases` are not reintroduced as new classes.
- [x] Test that high-image, nutrition-relevant candidates are accepted.
- [x] Test that low-image candidates are held or rejected.
- [x] Test that generated taxonomy appends new classes after existing classes without reordering existing IDs.

## Task 3: Candidate Mining Implementation

- [x] Implement `mine_clean_v3_candidates.py`.
- [x] Read `class_candidates.csv`.
- [x] Read `class_taxonomy.clean_candidate_2026-05-06.yaml` or another `--base-taxonomy`.
- [x] Read `clean_v3_candidate_policy.yaml`.
- [x] Aggregate candidates by normalized class.
- [x] Score each candidate using image count, instance count, source count, nutrition relevance, preparation specificity, blocked terms, aliases, and reject aliases.
- [x] Write:
  - `clean_v3_candidate_scorecard.csv`
  - `clean_v3_candidate_summary.json`
  - `class_taxonomy.clean_v3_expanded_YYYY-MM-DD.yaml` only when `--write-taxonomy` is set.

## Task 4: Local Candidate Gate

- [x] Run candidate mining on the latest available `class_candidates.csv`.
- [x] Stop if accepted + existing class count exceeds 260 without manual review.
- [x] Stop if accepted class report contains mojibake, empty class names, or blocked classes.
- [x] Review top accepted/held/rejected classes.
- [x] Record that current audited data produces 21 accepted new classes, 126 total classes.
- [x] Mark current data as enough for a V3 quality baseline but not enough for the 180-250 strong-expansion target.

## Task 5: Kaggle V3 Dataset Build

- [x] Generate V3 taxonomy after local gate passes.
- [x] Generate V3 source policy with higher cap only after accepted class list is stable.
- [x] Prepare local pipeline-code package.
- [x] Prepare local Clean Build V3 kernel folder.
- [x] Push/version pipeline-code dataset with V3 assets.
- [ ] Push Clean Build V3 kernel after current Clean Build V2 finishes or the Kaggle slot is free.
- [ ] Wait for Kaggle output using API/automation.
- [ ] Download reports only first; avoid large dataset zip unless training kernel requires mounted output.
- [ ] Pass only if `hard_gate_passed=true`, no malformed rows, no class out of range rows, and class distribution meets V3 thresholds.

## Task 6: YOLO11m V3 Train And Eval

- [x] Prepare local YOLO11m Clean V3 train kernel folder.
- [ ] Push YOLO11m Clean V3 train kernel in fine-tune mode from the best prior checkpoint.
- [ ] Wait via Kaggle API/automation.
- [ ] Download `best.pt`, `best.onnx`, `last.pt`, `results.csv`, `args.yaml`, and logs.
- [ ] Run public diagnostic runtime eval and real golden eval if available.
- [ ] Promote only if hit-rate, empty-rate, and regression gates pass.
- [ ] Consider YOLO11l only if V3 data gates pass and YOLO11m still fails for capacity reasons.

## Verification Commands

```powershell
.\ai-provider\.venv\Scripts\python.exe -m unittest ai-provider\tests\test_dataset_v2_clean_v3_candidate_mining.py
.\ai-provider\.venv\Scripts\python.exe -m unittest ai-provider\tests\test_dataset_v2_yolo11m_train_handoff.py
.\ai-provider\.venv\Scripts\python.exe -m py_compile ai-provider\dataset_v2\mine_clean_v3_candidates.py
```
