# EatFitAI Commercial Food Model Research - 2026-05-15

## Executive Decision

Do not treat the current V4 private class-expansion dataset as a commercial
training base. It is useful for research and accuracy exploration, but it
includes noncommercial lanes such as CC-BY-NC sources. A commercially usable
"extremely strong" model needs a separate V5-commercial lane with a strict
license ledger and a different model-stack decision.

Recommended target:

- Commercial lane name: `Food Model V5 Commercial`.
- Goal: 180-260 high-confidence commercial-safe detector classes first, then
  expand toward 300+ only after first-party data grows.
- Model stack:
  - If an Ultralytics Enterprise license is available: YOLO11m/l can remain a
    production candidate.
  - Without an Enterprise license: use an Apache-2.0 stack such as RF-DETR,
    RT-DETR/PaddleDetection, or MMDetection-based detectors. Do not ship
    Ultralytics YOLO11-derived artifacts in a closed commercial product without
    resolving AGPL obligations.
- Dataset policy:
  - Approved-by-default: owned/contracted first-party data, CC0, MIT,
    Apache-2.0, CC-BY-4.0 with attribution tracking.
  - Blocked-by-default: CC-BY-NC, CC-BY-NC-SA, CC-BY-NC-ND, unknown,
    copyright-authors, provenance-only, or "license conflicts with description".
- Training policy:
  - Train only from a reproducible commercial manifest.
  - Keep research/private models separate from commercial models.
  - Promotion requires golden eval on copyright-cleared images, not just Kaggle
    validation metrics.

This is not legal advice. It is an engineering risk-control plan. A final
commercial release should still get legal review for the source ledger and model
license.

## Why Current V4 Is Not Commercial-Safe

The current V4 private lane reached a strong technical dataset gate, but it was
not designed as a commercial-clean artifact. It intentionally included
private/noncommercial source lanes to maximize class count and measure ceiling.

Examples from the current manifests:

- `zachaluza/cnfood-241` is marked `CC-BY-NC-3.0` and used only in the private
  class-expansion lane.
- `meowluvmatcha/vnfood-30-100` and `thomasnguyen6868/vietfood68` are marked
  `CC-BY-NC-SA-4.0`, so they are blocked for commercial training.
- Several useful sources remain `unknown`, `copyright-authors`, or
  `HOLD_LICENSE_REVIEW`.

Therefore, V4 can produce a strong research candidate, but the commercial model
must be rebuilt from a separate allowlist.

## License Ground Rules

Use these as hard gates in code, not spreadsheet comments:

- CC0: acceptable by default, but still record provenance. Creative Commons
  describes CC0 as the "no copyright reserved" tool.
- CC-BY-4.0: acceptable if attribution, source URL, license URL, and modification
  records are preserved. Creative Commons legal code grants reuse under license
  conditions.
- Apache-2.0 / MIT: acceptable for code and source packages, preserving license
  and notice obligations.
- CC-BY-NC / NC-SA / NC-ND: blocked for commercial model training unless
  separate written commercial permission is obtained. Creative Commons defines
  NonCommercial as not primarily intended for commercial advantage or monetary
  compensation.
- Unknown / copyright-authors / ambiguous dataset descriptions: blocked until
  resolved.
- AGPL model code or weights: blocked for closed commercial deployment unless
  the whole covered work complies with AGPL or an enterprise/commercial license
  is obtained.

Key sources:

- Creative Commons CC0: https://wiki.creativecommons.org/wiki/CC0
- Creative Commons CC-BY-4.0 legal code:
  https://creativecommons.org/licenses/by/4.0/legalcode
- Creative Commons NonCommercial interpretation:
  https://wiki.creativecommons.org/wiki/NonCommercial_interpretation
- Apache License 2.0: https://www.apache.org/licenses/LICENSE-2.0.html
- Ultralytics YOLO11 licensing:
  https://docs.ultralytics.com/models/yolo11/ and
  https://www.ultralytics.com/license

## Current Evidence Checked

Checked on 2026-05-15:

- Ultralytics license page states YOLO trained models are AGPL-3.0 by default
  and that Enterprise licensing allows embedding Ultralytics YOLO code/models
  in commercial products without AGPL open-source constraints.
- RF-DETR repository states the open-source `rfdetr` package and
  Apache-designated model weights are Apache-2.0, while Plus components are
  PML 1.0.
- AIcrowd Food Recognition Benchmark 2022 rules state the MyFoodRepo dataset
  is released under CC-BY-4.0.
- Open Images V7 facts page states Google annotations are CC-BY-4.0 and warns
  that image license status should be verified per image.
- PaddleDetection and MMDetection repositories state Apache-2.0 licenses.

These checks support using RF-DETR, RT-DETR/PaddleDetection, or MMDetection as
commercial-safe candidates, and keeping Ultralytics YOLO11 behind an explicit
Enterprise-license gate.

## Model Stack Options

### Option A - YOLO11 With Enterprise License

Best if the product needs the fastest path from current work to production.

Pros:

- Existing EatFitAI code already uses YOLO-style outputs.
- Current V4 work can be adapted quickly.
- Strong deployment ecosystem: ONNX, mobile/server inference, known thresholds.

Commercial blocker:

- Ultralytics documents YOLO11 as AGPL-3.0 plus Enterprise licensing. Their
  commercial license page says Enterprise licensing is the path for embedding
  Ultralytics YOLO code/models in commercial products without AGPL constraints.

Decision:

- Use YOLO11 for internal research now.
- For commercial release, either obtain Enterprise license or migrate the
  commercial lane to a permissive detector.

### Option B - RF-DETR Commercial Lane

Best default if we want a strong detector without AGPL exposure.

Pros:

- RF-DETR is marketed as real-time SOTA detection/segmentation and the main
  open-source package plus Apache-designated weights are Apache-2.0.
- Transformer detector may generalize better on messy food scenes than YOLO
  when classes are visually close.
- Apache-2.0 is cleaner for closed commercial products than AGPL.

Risks:

- Newer stack than YOLO; integration/testing cost is higher.
- Need ONNX/export/mobile benchmarking before committing to app deployment.
- Must avoid RF-DETR Plus components if their license is not acceptable.

Sources:

- RF-DETR GitHub/license statement: https://github.com/roboflow/rf-detr
- RF-DETR model page: https://roboflow.com/model/rf-detr

### Option C - RT-DETR / MMDetection Commercial Lane

Best if we want conservative open-source infrastructure.

Pros:

- PaddleDetection includes RT-DETR and is Apache-2.0.
- MMDetection is Apache-2.0 and gives access to a broader detector zoo for
  controlled experiments.
- Easier to keep model artifacts inside a permissive software stack.

Risks:

- More engineering time than Ultralytics.
- Export/runtime path must be proven for current EatFitAI serving stack.

Sources:

- PaddleDetection: https://github.com/PaddlePaddle/PaddleDetection
- MMDetection: https://github.com/open-mmlab/mmdetection

## Commercial-Safe Data Strategy

### Tier 0 - Owned Data

This is the only path to a defensible, strong commercial model.

Collect:

- 20k-50k first-party images in the first tranche.
- 100k+ over time for a genuinely strong Vietnamese/general food detector.
- Written rights assignment or commercial training consent.
- Per-image metadata: owner, capture date, location category, consent status,
  class labels, annotator, QA reviewer.

Use owned data for:

- Vietnamese dishes.
- Multi-food tray/plate scenes.
- Local packaging, utensils, lighting, camera angles.
- Hard negatives: empty plates, hands, tableware, drinks, non-food objects.

### Tier 1 - Public Data Allowed In Commercial Lane

Use only after per-source evidence is stored in `source_ledger.csv`.

Candidate sources:

- MyFoodRepo / Food Recognition Benchmark:
  - AIcrowd rules state the dataset is released under CC-BY-4.0.
  - Strong fit: real-world food recognition and detection/segmentation style.
  - Must preserve attribution.
  - Source:
    https://www.aicrowd.com/challenges/food-recognition-benchmark-2022/challenge_rules
- FoodSeg103:
  - Useful for ingredient/component segmentation converted to boxes.
  - Local manifest marks the Kaggle mirror as Apache-2.0, but before commercial
    use, confirm original dataset terms and store the evidence.
  - Source repo:
    https://github.com/LARC-CMU-SMU/FoodSeg103-Benchmark-v1
- Open Images V7:
  - Useful for ingredient/object classes such as fruit, vegetable, meat,
    bottle, bowl, spoon, etc.
  - Official Open Images facts page states annotations are CC-BY-4.0. Images
    originate from Creative Commons sources, but we should preserve per-image
    attribution and license metadata.
  - Source:
    https://storage.googleapis.com/openimages/web/factsfigures_v7.html
- Current Kaggle candidates that may be commercial-safe after re-verification:
  - `bjoernjostein/food-classification` - local manifest: CC0-1.0.
  - `raahimshah/desi-food-dataset-annotated` - local manifest: MIT.
  - `karos2504/100-vietnamese-food` - local manifest: Apache-2.0.
  - `henningheyen/lvis-fruits-and-vegetables-dataset` - local manifest: MIT.
  - `fontainenathan/foodseg103` - local manifest: Apache-2.0.

### Tier 2 - Research Only

Keep these out of commercial model training:

- `zachaluza/cnfood-241`: CC-BY-NC-3.0.
- `meowluvmatcha/vnfood-30-100`: CC-BY-NC-SA-4.0.
- `thomasnguyen6868/vietfood68`: CC-BY-NC-SA-4.0.
- `phantrihieu/vnfood-combined-dataset`: CC-BY-NC-SA-4.0.
- Any `unknown`, `copyright-authors`, `HOLD_LICENSE`, `HOLD_LICENSE_REVIEW`,
  `HOLD_PROVENANCE_SAMPLE_ONLY`, or `REJECT_LICENSE` source.

## Target Taxonomy

Do not start commercial V5 at 310 classes. That number came from the private
accuracy-ceiling lane.

Recommended V5-commercial taxonomy:

- Phase 1: 180-220 classes.
  - Keep only visually separable foods.
  - Keep strong ingredient/component classes.
  - Remove regional aliases that look identical.
  - Use nutrition mapping to support extra dish names outside the detector.
- Phase 2: 220-260 classes.
  - Add classes only when first-party or CC-BY/CC0 evidence supports them.
- Phase 3: 300+ classes.
  - Only after owned data and golden eval prove the long tail is not hurting
    core recall.

Detector classes should be visually learnable. App food names can be richer
than detector classes through mapping:

- `detector_class`: `fried_rice`
- aliases: `com_chien`, `com_chien_trung`, `com_chien_hai_san`
- nutrition profiles: different serving defaults and macro estimates

## Training Recipe

### Stage 1 - Commercial Baseline Detector

- Model: RF-DETR base/large or RT-DETR-L, plus YOLO11 only if Enterprise
  license is approved.
- Data:
  - MyFoodRepo/Food Recognition Benchmark CC-BY.
  - FoodSeg/Open Images components.
  - Commercial-safe Kaggle sources after ledger verification.
- Purpose:
  - Learn robust multi-food scenes and general components.

### Stage 2 - Vietnamese And EatFitAI Domain Fine-Tune

- Data:
  - First-party Vietnamese dishes.
  - User-consented examples.
  - Controlled captures from common EatFitAI use cases.
- Augmentation:
  - Moderate color/lighting augmentation.
  - Avoid over-rotating/warping dishes.
  - Add camera blur and low-light only if common in app telemetry.

### Stage 3 - Hard Negative And Calibration

- Add non-food objects, empty plates, packaging, utensils, partial crops.
- Calibrate confidence thresholds per class.
- Optimize for nutrition impact, not raw mAP only.

## Evaluation Gates

A commercial model is not promoted from validation mAP alone.

Required gates:

- Golden set:
  - 1,000+ first-party/copyright-cleared images.
  - At least 20-50 images for top 50 production classes.
  - Multi-food scenes and common mobile failure modes.
- Metrics:
  - mAP50-95 for detector health.
  - Recall@top-k for app usability.
  - False positive rate on hard negatives.
  - Nutrition-impact weighted error: high-calorie misses matter more.
  - Latency and memory on target backend.
- Release criteria:
  - Must beat current production model on golden set.
  - Must not regress top daily foods.
  - Must pass attribution/license audit.

## Implementation Plan

### Task 1 - Commercial Source Ledger

Create:

- `ai-provider/dataset_v2/commercial_source_ledger_2026-05-15.csv`

Columns:

- `source_slug`
- `dataset_ref`
- `license_declared`
- `license_url`
- `license_evidence_url`
- `commercial_allowed`
- `attribution_required`
- `redistribution_allowed`
- `derivative_training_allowed`
- `verification_status`
- `blocked_reason`

Hard rule:

- `commercial_allowed != yes` means source cannot enter V5-commercial train.

### Task 2 - V5 Commercial Taxonomy

Create:

- `class_taxonomy.commercial_v5_seed_2026-05-15.yaml`

Rules:

- Start from existing classes only if source provenance is acceptable.
- Add commercial-safe public classes.
- Mark every class with source coverage.
- Separate detector labels from app/nutrition aliases.

### Task 3 - V5 Commercial Builder

Create a new build script rather than mutating V4 private builder:

- `build_clean_dataset_v5_commercial.py`
- `kaggle_clean_build_v5_commercial_kernel.py`

Hard behavior:

- Fail if any source is NC/unknown/copyright-authors.
- Fail if attribution ledger is missing for CC-BY.
- Output both dataset archive and reports.
- Keep commercial and private artifacts physically separate.

### Task 4 - Model Comparison Harness

Run at least two candidates:

- RF-DETR commercial baseline.
- RT-DETR or MMDetection baseline.
- YOLO11 only if Enterprise license is resolved.

Do not choose by architecture hype. Choose by golden-set score, latency, export
path, and license clarity.

### Task 5 - Commercial Model Card

Every commercial candidate needs:

- source ledger hash
- taxonomy hash
- train command
- checkpoint hash
- source license summary
- attribution file
- golden-set metrics
- known failure modes
- deployment constraints

## Immediate Recommendation

For the current workstream:

1. Let the current V4 private/research train only if it is already running and
   useful as an accuracy ceiling.
2. Do not promote V4 private model commercially.
3. Start `V5 Commercial` as a separate branch/artifact lane.
4. Use RF-DETR or RT-DETR as the default commercial-safe model stack unless an
   Ultralytics Enterprise license is explicitly approved.
5. Build the first commercial-clean dataset from:
   - owned/consented images,
   - MyFoodRepo/Food Recognition Benchmark CC-BY,
   - Open Images ingredient/object classes,
   - FoodSeg/component sources after original license confirmation,
   - locally verified CC0/MIT/Apache/CC-BY Kaggle sources.

The strongest commercial model will not come from simply adding more public
classes. It will come from strict source legality, first-party data, commercial
golden eval, and a permissive or licensed model stack.
