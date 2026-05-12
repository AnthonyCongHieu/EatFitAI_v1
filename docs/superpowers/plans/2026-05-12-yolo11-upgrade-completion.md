# YOLO11 Upgrade Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the YOLO11 upgrade after YOLO11m Clean V1 deployment by gating real-image quality, deciding whether to freeze V1, and only then opening Clean V2 or YOLO11l work.

**Architecture:** Keep model training and quality gates separate. Local code owns manifest validation, golden-eval comparison, error mining, and decision reports; Kaggle remains the train/export runtime for YOLO11m/YOLO11l candidates.

**Tech Stack:** Python, Ultralytics YOLO, Kaggle kernels, CSV/JSON reports, existing Dataset V2 scripts under `ai-provider/dataset_v2`.

---

## File Structure

- Modify: `ai-provider/dataset_v2/evaluate_golden_set.py`
  - Compares YOLOv8 rollback artifact with YOLO11m Clean V1.
  - Writes JSON summary, decision status, and CSV error-mining report.
- Create: `ai-provider/tests/test_dataset_v2_golden_eval.py`
  - Unit tests for golden-eval scoring, regression detection, and decision routing.
- Use: `ai-provider/dataset_v2/golden_eval_manifest.csv`
  - Operator-managed manifest of real app photos.
- Use: `ai-provider/dataset_v2/clean_candidate_sources_2026-05-06.csv`
  - Clean V1 source policy; update only when golden eval proves a Clean V2 gap.
- Use: `ai-provider/dataset_v2/class_taxonomy.clean_candidate_2026-05-06.yaml`
  - Clean V1 taxonomy; copy to a dated Clean V2 taxonomy before widening class scope.
- Use: `ai-provider/dataset_v2/kaggle_yolo11m_train.py`
  - YOLO11m train/resume/export entrypoint.

---

### Task 1: Build `golden_eval_v1`

**Files:**
- Modify: `ai-provider/dataset_v2/golden_eval_manifest.csv`
- Read: `ai-provider/dataset_v2/class_taxonomy.clean_candidate_2026-05-06.yaml`

- [ ] **Step 1: Collect real app photos**

Collect 300-500 images from actual EatFitAI scan flows. Keep these scenario buckets:

```text
single_common_dish
multi_dish_meal
vietnamese_noodle_or_soup
rice_plate
ingredient_or_spice
bad_lighting
angled_or_partial_crop
false_positive_risk
```

- [ ] **Step 2: Fill manifest rows**

Use canonical ASCII labels from `class_taxonomy.clean_candidate_2026-05-06.yaml`. Example rows:

```csv
image_path,scenario,expected_objects,notes
golden_eval_v1/images/001.jpg,rice_plate,"rice, grilled_pork_belly, cucumber","real app photo"
golden_eval_v1/images/002.jpg,ingredient_or_spice,"garlic, chili, lime","kitchen ingredient scene"
```

- [ ] **Step 3: Validate manifest references existing files**

Run:

```powershell
.\ai-provider\.venv\Scripts\python.exe ai-provider\dataset_v2\evaluate_golden_set.py `
  --manifest ai-provider\dataset_v2\golden_eval_manifest.csv `
  --validate-only
```

Expected output:

```json
{"manifest":"ai-provider\\dataset_v2\\golden_eval_manifest.csv","images":300,"status":"ok"}
```

---

### Task 2: Run YOLOv8 vs YOLO11m Clean V1 Golden Eval

**Files:**
- Use: `ai-provider/model_backups/yolov8_2026-05-08/best.pt`
- Use: `ai-provider/best.onnx`
- Modify generated output: `_dataset_v2_reports/golden_eval_comparison.json`
- Modify generated output: `_dataset_v2_reports/golden_eval_errors.csv`

- [ ] **Step 1: Run the comparison**

Run from repo root:

```powershell
.\ai-provider\.venv\Scripts\python.exe ai-provider\dataset_v2\evaluate_golden_set.py `
  --old-model ai-provider\model_backups\yolov8_2026-05-08\best.pt `
  --new-model ai-provider\best.onnx `
  --manifest ai-provider\dataset_v2\golden_eval_manifest.csv `
  --out _dataset_v2_reports\golden_eval_comparison.json `
  --errors-out _dataset_v2_reports\golden_eval_errors.csv `
  --conf 0.25
```

Expected output includes:

```json
{
  "overall": {
    "images": 300,
    "old_hit_rate": 0.0,
    "new_hit_rate": 0.0,
    "hit_rate_delta": 0.0
  },
  "decision": {
    "status": "promote_yolo11m_clean_v1"
  }
}
```

The numeric values above are shape examples. Use the actual JSON values produced by the script.

- [ ] **Step 2: Commit only if the manifest is intentionally part of source**

Do not commit real user photos, generated reports, model checkpoints, or local `_dataset_v2_reports` output unless the repository policy explicitly changes.

---

### Task 3: Decide V1 Freeze, Runtime Tuning, or Clean V2

**Files:**
- Read: `_dataset_v2_reports/golden_eval_comparison.json`
- Read: `_dataset_v2_reports/golden_eval_errors.csv`

- [ ] **Step 1: Read the decision status**

Use the JSON field:

```json
{
  "decision": {
    "status": "promote_yolo11m_clean_v1",
    "next_step": "Freeze YOLO11m Clean V1 as the production model and keep YOLOv8 as rollback only."
  }
}
```

- [ ] **Step 2: Follow the exact route**

Decision routes:

```text
promote_yolo11m_clean_v1
-> Freeze V1, document artifact version, monitor production 3-7 days.

tune_runtime_thresholds_first
-> Adjust confidence/recovery thresholds, rerun golden eval, avoid retraining first.

build_yolo11m_clean_v2
-> Use golden_eval_errors.csv for hard-mining, update Clean V2 source policy/taxonomy, train YOLO11m Clean V2.

collect_more_golden_images
-> Add more real app photos before any model decision.
```

---

### Task 4: Hard-Mine Clean V2 Only If Golden Eval Fails

**Files:**
- Read: `_dataset_v2_reports/golden_eval_errors.csv`
- Copy then modify: `ai-provider/dataset_v2/class_taxonomy.clean_candidate_2026-05-06.yaml`
- Copy then modify: `ai-provider/dataset_v2/clean_candidate_sources_2026-05-06.csv`

- [ ] **Step 1: Create dated Clean V2 files**

Use a date suffix so Clean V1 stays reproducible:

```text
ai-provider/dataset_v2/class_taxonomy.clean_v2_2026-05-12.yaml
ai-provider/dataset_v2/clean_candidate_sources_v2_2026-05-12.csv
```

- [ ] **Step 2: Convert error rows into data actions**

Map each error into one of these actions:

```text
missing_existing_class -> add/boost source rows for the same canonical class
confused_existing_class -> inspect label aliases and near-duplicate classes
missing_new_food_class -> add class only if it has enough train/valid/test support
ingredient_or_spice_regression -> boost ingredient/spice sources before changing model size
multi_dish_miss -> prioritize multi-object meal-tray sources
```

- [ ] **Step 3: Keep YOLO11m as the next model**

Train YOLO11m Clean V2 first. Do not jump to YOLO11l until YOLO11m Clean V2 fails the same golden-eval gates.

---

### Task 5: Train YOLO11m Clean V2

**Files:**
- Modify if Clean V2 file names change: `ai-provider/dataset_v2/kaggle_clean_build_kernel.py`
- Modify if Clean V2 file names change: `ai-provider/dataset_v2/kaggle_yolo11m_train.py`
- Use: `ai-provider/dataset_v2/kaggle_remote_orchestrator.py`

- [ ] **Step 1: Build and validate the Clean V2 dataset**

Run after V2 source policy/taxonomy are created:

```powershell
.\ai-provider\.venv\Scripts\python.exe ai-provider\dataset_v2\build_clean_dataset.py `
  --audit-json _dataset_v2_reports\source_audit.json `
  --taxonomy ai-provider\dataset_v2\class_taxonomy.clean_v2_2026-05-12.yaml `
  --source-policy ai-provider\dataset_v2\clean_candidate_sources_v2_2026-05-12.csv `
  --out-dataset _dataset_v2_work\clean_dataset_v2 `
  --out-reports _dataset_v2_reports

.\ai-provider\.venv\Scripts\python.exe ai-provider\dataset_v2\validate_clean_dataset.py `
  --dataset _dataset_v2_work\clean_dataset_v2 `
  --out _dataset_v2_reports\clean_v2_audit_summary.json
```

- [ ] **Step 2: Push Kaggle clean-build and training kernels**

Use the existing orchestrator flow from `ai-provider/dataset_v2/README.md`. Keep artifacts private:

```powershell
.\ai-provider\.venv\Scripts\python.exe ai-provider\dataset_v2\prepare_kaggle_packages.py pipeline-code --out-dir _dataset_v2_pipeline_code_package
.\ai-provider\.venv\Scripts\python.exe ai-provider\dataset_v2\kaggle_remote_orchestrator.py dataset --folder _dataset_v2_pipeline_code_package --message "Dataset V2 pipeline code for YOLO11m Clean V2"
.\ai-provider\.venv\Scripts\python.exe ai-provider\dataset_v2\kaggle_remote_orchestrator.py prepare-kernel --kernel-metadata ai-provider\dataset_v2\kaggle_kernel_metadata.json --out-dir _dataset_v2_yolo11m_full_kernel
.\ai-provider\.venv\Scripts\python.exe ai-provider\dataset_v2\kaggle_remote_orchestrator.py push-kernel --folder _dataset_v2_yolo11m_full_kernel
```

- [ ] **Step 3: Pull artifacts and rerun golden eval**

Download `best.pt`, `best.onnx`, `last.pt`, `results.csv`, `args.yaml`, class list, and logs. Then rerun Task 2 with the Clean V2 artifact as `--new-model`.

---

### Task 6: Evaluate YOLO11l Only After YOLO11m Clean V2

**Files:**
- Copy before modifying: `ai-provider/dataset_v2/kaggle_yolo11m_train.py`
- Copy before modifying: `ai-provider/dataset_v2/kaggle_kernel_metadata.json`

- [ ] **Step 1: Confirm YOLO11m Clean V2 failed for model-capacity reasons**

YOLO11l is allowed only if:

```text
Clean V2 dataset gates passed
YOLO11m Clean V2 completed or resumed to the target epoch
Golden eval still fails mainly on visually difficult classes
Errors are not caused by missing labels, bad taxonomy, or threshold policy
Kaggle quota can support the larger model
```

- [ ] **Step 2: Create a separate YOLO11l kernel**

Use a new Kaggle kernel ID and run name so YOLO11m artifacts stay rollback-safe:

```text
hiuinhcng/eatfitai-yolo11l-clean-v2
yolo11l-eatfitai-clean-v2
```

- [ ] **Step 3: Compare YOLO11l against YOLO11m Clean V2**

Use the same `golden_eval_manifest.csv` and require YOLO11l to beat YOLO11m Clean V2, not merely YOLOv8.

---

## Verification

- [ ] Run unit tests:

```powershell
.\ai-provider\.venv\Scripts\python.exe -m unittest discover -s ai-provider\tests -p test_dataset_v2_golden_eval.py
```

- [ ] Run existing training handoff tests:

```powershell
.\ai-provider\.venv\Scripts\python.exe -m unittest discover -s ai-provider\tests -p test_dataset_v2_yolo11m_train_handoff.py
```

- [ ] Run model-class integration tests after replacing ONNX:

```powershell
.\ai-provider\.venv\Scripts\python.exe -m unittest discover -s ai-provider\tests -p test_yolo11m_model_classes.py
```
