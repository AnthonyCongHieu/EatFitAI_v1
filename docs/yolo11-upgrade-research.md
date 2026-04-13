# YOLO11 Upgrade Research

## Table of Contents
- [Summary](#summary)
- [Verified Current State](#verified-current-state)
- [Current Contradictions](#current-contradictions)
- [Research Goal And Success Criteria](#research-goal-and-success-criteria)
- [Verified Dataset Candidates](#verified-dataset-candidates)
- [Expanded Candidate Pool](#expanded-candidate-pool)
- [Dataset Scoring Framework](#dataset-scoring-framework)
- [Taxonomy Draft](#taxonomy-draft)
- [Golden Benchmark Set](#golden-benchmark-set)
- [Data Strategy](#data-strategy)
- [YOLO11 Benchmark And Training Strategy](#yolo11-benchmark-and-training-strategy)
- [How Production Apps Make This Work Better](#how-production-apps-make-this-work-better)
- [Optimization Loop](#optimization-loop)
- [Risks And Validation](#risks-and-validation)
- [Implementation-Ready Next Steps](#implementation-ready-next-steps)

## Summary
- This document is the single source of truth for YOLO11 upgrade research and planning in this repo.
- The real baseline is the runtime artifact `ai-provider/best.pt`, not the root 10-class prototype script.
- The current `best.pt` exposes `63` classes and is still wired into runtime through `ai-provider/app.py`.
- The target direction is a `data-first` upgrade toward a mixed detector with explicit `dish/*` and `ingredient/*` semantics.
- The final model must be chosen by real-photo performance, not by public mAP alone.
- The default training lane is `Colab-first`.

## Verified Current State

### Runtime and artifact facts
- `Verified from repo`: `ai-provider/app.py` loads `best.pt` when present and falls back to `yolov8s.pt` when `best.pt` is missing.
- `Verified from repo`: `ai-provider/app.py` reports `model_type` as `yolov8-custom-eatfitai` when `best.pt` is active, and `yolov8-pretrained` otherwise.
- `Verified from repo`: `ai-provider/README.md` documents `best.pt` as the primary model file and `yolov8s.pt` as the fallback model file.
- `Verified from repo`: `ai-provider/train_local.py` copies trained weights back into `ai-provider/best.pt`, so local runtime currently depends on that artifact name.

### Model facts
- `Verified from repo`: `ai-provider/best.pt` exists in the workspace and is the active custom-model artifact expected by runtime.
- `Verified from repo`: loading `best.pt` through the local `ai-provider/.venv` shows a detection model with `63` classes.
- `Verified from repo`: the current class list is:

```text
apple, avocado, banana, bayleaf, beans, beef, beet, bell_pepper, blueberry,
broccoli, cabbage, carrot, cauliflower, celery, cherry, chicken, chickpeas,
cloves, coriander, corn, cranberry, cucumber, curry_powder, egg, eggplant,
fish, garlic, ginger, gooseberry, grape, guava, kumquat, lamb, leek, lemon,
lettuce, mango, marrow, mulberry, okra, onion, orange, papaya, peanut, pear,
peas, pepper, pineapple, pork, potato, pumpkin, radish, raspberry, rice,
salad, salt, shrimp, spinach, spring_onion, squash, strawberry, tomato,
turmeric
```

### Training and data pipeline facts
- `Verified from repo`: `ai-provider/train_local.py` searches for `datasets/**/data.yaml`.
- `Verified from repo`: `ai-provider/train_local.py` uses `yolov8s.pt` as the pretrained starting point, with `workers=0` and `batch=8`.
- `Verified from repo`: `continue_training.py` exists as a Windows-focused workaround that continues from `runs/detect/eatfitai_ingredients/weights/last.pt`.
- `Verified from repo`: the root-level pipeline includes `1_download_data.py`, `2_merge_dataset.py`, and `3_train_eatfit_v2.py`.
- `Verified from repo`: `2_merge_dataset.py` builds a merged dataset in `./eatfit_master_dataset`.
- `Verified from repo`: `3_train_eatfit_v2.py` sets `val` to `images/train`, so that path does not create a real validation split.

### Encoding facts
- `Verified from repo`: training and data-related files have shown mojibake or encoding-risk symptoms during inspection, including `3_train_eatfit_v2.py`, `data_sources.md`, `master_classes.json`, and `ai-provider/TRAINING_GUIDE.md`.
- `Verified from repo`: the repo already includes `scripts/cloud/check_mojibake.py` to scan for likely mojibake markers.

## Current Contradictions

### Root prototype vs runtime truth
- `Verified from repo`: `3_train_eatfit_v2.py` hardcodes only `10` classes.
- `Verified from repo`: runtime `best.pt` actually contains `63` classes.
- `Inference / recommendation`: the root script is not the current production truth and should not be treated as the baseline model definition.

### YOLO11 naming vs YOLOv8 runtime labeling
- `Verified from repo`: `3_train_eatfit_v2.py` already references `yolo11m.pt`.
- `Verified from repo`: `ai-provider/app.py` still reports YOLOv8-style runtime metadata.
- `Verified from repo`: `ai-provider/train_local.py` still starts from `yolov8s.pt`.
- `Inference / recommendation`: the repo is in a mixed-state transition where naming, training entrypoints, and runtime health metadata are not aligned.

### Ingredient-heavy history vs dish-plus-ingredient target
- `Verified from repo`: the current `best.pt` is ingredient-heavy and generic-food-heavy.
- `Inference / recommendation`: that is not enough for the new goal, which prioritizes Vietnamese dishes plus a curated ingredient subset.

### UTF-8 and text safety risk
- `Verified from repo`: the repo already contains evidence that Vietnamese text handling has been fragile.
- `Inference / recommendation`: future taxonomy or alias files should be treated as UTF-8-sensitive assets.

## Research Goal And Success Criteria

### Primary goal
- `Inference / recommendation`: build a research process that maximizes recognition quality on real phone photos, not just leaderboard-style public validation numbers.

### V1 target definition
- `Inference / recommendation`: V1 should be a mixed detector with two namespaces:
  - `dish/*`
  - `ingredient/*`
- `Inference / recommendation`: V1 should use a core class set with enough sample density to train reliably.

### Success criteria
- `Inference / recommendation`: the research output must clearly answer:
  - what the baseline model really is
  - which datasets are credible enough to use
  - which classes belong in V1
  - how model candidates will be benchmarked
  - how to choose the final model based on real-photo performance

### Final model selection priority
- `Inference / recommendation`: select the final model in this order:
  1. recall of the main dish on real-phone benchmark images
  2. low false-positive rate on realistic meal photos
  3. strong `mAP50-95`
  4. acceptable inference speed

## Verified Dataset Candidates

## External sources used here
- [Ultralytics YOLO11 docs](https://docs.ultralytics.com/models/yolo11/)
- [Ultralytics Train docs](https://docs.ultralytics.com/modes/train/)
- [Ultralytics Val docs](https://docs.ultralytics.com/modes/val/)
- [Kaggle VietFood67](https://www.kaggle.com/datasets/thomasnguyen6868/vietfood68)
- [Roboflow Vietnamese Food](https://universe.roboflow.com/nhh/vietnamese-food)
- [Roboflow FOOD-INGREDIENTS](https://universe.roboflow.com/food-recipe-ingredient-images-0gnku/food-ingredients-dataset/dataset/4)

### Dish candidate 1: VietFood67 on Kaggle
- URL: [Kaggle VietFood67](https://www.kaggle.com/datasets/thomasnguyen6868/vietfood68)
- `Verified from source page`: accessible search results describe it as a Vietnamese food dataset with bounding boxes.
- `Verified from source page`: accessible search results say it covers `67` food categories and includes an extra face-related class.
- `Verified from source page`: accessible search results position it for detection and nutrition-related use cases.
- Label type: `Verified from source page` as bounding boxes, but exact export format still needs direct download-side confirmation.
- License: `Verified from source page` not confirmed from the accessible page content in this pass.
- Fit: `Inference / recommendation`: main `dish/*` backbone candidate.

### Dish candidate 2: Roboflow Vietnamese Food
- URL: [Roboflow Vietnamese Food](https://universe.roboflow.com/nhh/vietnamese-food)
- `Verified from source page`: project type is Object Detection.
- `Verified from source page`: page shows `1000` images.
- `Verified from source page`: page shows `5` classes represented as `Banh-Mi`, `Bot Chien`, `Bun`, `Goi-Cuon`, and `Pho`.
- `Verified from source page`: page shows license `CC BY 4.0`.
- Fit: `Inference / recommendation`: supplemental `dish/*` dataset and sanity-benchmark source.

### Ingredient candidate 1: Roboflow FOOD-INGREDIENTS v4
- URL: [Roboflow FOOD-INGREDIENTS](https://universe.roboflow.com/food-recipe-ingredient-images-0gnku/food-ingredients-dataset/dataset/4)
- `Verified from source page`: project type is Object Detection.
- `Verified from source page`: the project overview shows `4196` images.
- `Verified from source page`: dataset version `v4` shows `9780 Total Images`.
- `Verified from source page`: split counts shown are train `8376`, valid `829`, test `575`.
- `Verified from source page`: YOLOv11 export is available.
- `Verified from source page`: preprocessing includes auto-orient and resize to `640x640`.
- `Verified from source page`: visible augmentations include flips, blur, and noise.
- License: `Verified from source page` not confirmed from the accessible page content in this pass.
- Fit: `Inference / recommendation`: main `ingredient/*` candidate pending class-level inspection.

### Hold or reject items
- `Verified from repo`: the root 10-class script path should not be used as the baseline.
- `Inference / recommendation`: the current `63` runtime classes should be treated as a reference input, not as the final target taxonomy.
- `Inference / recommendation`: broad generic datasets should remain on hold unless the selected datasets prove insufficient.

## Expanded Candidate Pool

### Additional ingredient and grocery candidates

#### 1. Ingredient Detection by Foody
- URL: [Ingredient Detection](https://universe.roboflow.com/foody-8k61y/ingredient-detection-0tusu)
- `Verified from source page`: Roboflow Universe page presents this as an Object Detection dataset.
- `Verified from source page`: the visible page summary shows `25k` images and `40` classes.
- `Verified from source page`: the visible class list includes practical classes such as `apple`, `avocado`, `bacon`, `basil`, `beef`, `bell pepper`, `bread`, `broccoli`, `butter`, `carrot`, `cauliflower`, `cheese`, `chicken`, `cucumber`, `egg`, `garlic`, `ginger`, `lemon`, `lettuce`, `mango`, `mushroom`, `onion`, `pasta`, `potato`, `pumpkin`, `rice`, `salmon`, `spinach`, `tofu`, and `tomato`.
- `Verified from source page`: license is shown as `CC BY 4.0`.
- `Inference / recommendation`: this is one of the strongest newly found candidates for `ingredient/*`, especially because the class list is more practical for real cooking than some broader ingredient sets.
- Recommended bucket: `core` candidate, pending class overlap and duplicate-style review against FOOD-INGREDIENTS.

#### 2. Grocery Store Dataset
- URL: [Grocery Store](https://universe.roboflow.com/yolo-9co33/grocery-store-hr9us)
- `Verified from source page`: Roboflow Universe page presents this as an Object Detection dataset.
- `Verified from source page`: the visible page summary shows `809` images and `21` classes.
- `Verified from source page`: visible classes include `Apple`, `Tomato`, `Carrot`, `Onion`, `Cucumber`, `Cabbage`, `Mushroom`, `Garlic`, `Ginger`, `Sweet potato`, `Asparagus`, `Brinjal`, `Capsicum`, `Leek Leaves`, and `Redchilli`.
- `Verified from source page`: license is shown as `CC BY 4.0`.
- `Inference / recommendation`: this dataset is small, but its grocery-store capture style may be closer to messy real-world produce photos than some clean ingredient datasets.
- Recommended bucket: `supplement`.

#### 3. Supermarket Items (YOLOv7)
- URL: [Supermarket Items (YOLOv7)](https://universe.roboflow.com/endexspace/supermarket-items-yolov7)
- `Verified from source page`: Roboflow Universe page presents this as an object detection dataset.
- `Verified from source page`: the visible page summary shows `4.1k` images and `30` classes.
- `Verified from source page`: visible classes include `apple`, `banana`, `tomato`, `carrot`, `chicken`, `potato`, `milk`, `bread`, `onion`, `cheese`, `corn`, `shrimp`, `butter`, `beef`, `sugar`, `lime`, `eggs`, `flour`, `ground_beef`, `mushrooms`, `spinach`, and `sweet_potato`.
- `Verified from source page`: the page states the images and annotations were sourced from elsewhere rather than created by the uploader.
- `Inference / recommendation`: class list is useful, but provenance risk is higher than with cleaner first-party-looking sources.
- Recommended bucket: `hold` unless provenance and consistency are reviewed more carefully.

### Additional produce-focused candidates

#### 4. LVIS Fruits And Vegetables Dataset
- URL: [LVIS Fruits And Vegetables Dataset](https://www.kaggle.com/datasets/henningheyen/lvis-fruits-and-vegetables-dataset)
- `Verified from source page`: this is a YOLO-formatted object detection dataset based on LVIS.
- `Verified from source page`: the dataset page states `8221` images and `63` classes, with `6721` train, `1500` validation, and `180` manually labeled test images.
- `Verified from source page`: license is `MIT`.
- `Inference / recommendation`: this is a strong supplemental source for produce-heavy `ingredient/*` classes because it is already YOLO-formatted and has a clean split story.
- Recommended bucket: `supplement`, or `core` only for fruit-and-vegetable subsets if overlap is needed.

#### 5. Fruits & Vegetable Detection for YOLOv4
- URL: [Fruits & Vegetable Detection for YOLOv4](https://www.kaggle.com/datasets/kvnpatel/fruits-vegetable-detection-for-yolov4)
- `Verified from source page`: dataset page describes it as object detection for `14` classes of fruits and vegetables.
- `Verified from source page`: the author explicitly positions it around supermarket self-checkout and semi-transparent plastic bag conditions.
- `Verified from source page`: license line says `Data files © Original Authors`.
- `Inference / recommendation`: the real-life supermarket framing is attractive, but rights clarity is weaker than MIT/CC BY style sources.
- Recommended bucket: `hold`, use only if provenance is acceptable for the project.

#### 6. Fruit Classification Dataset
- URL: [Fruit Classification dataset](https://www.kaggle.com/datasets/jiscecseaiml/fruit-classification-dataset)
- `Verified from source page`: the page states `8,099` high-resolution images of apples, bananas, and oranges, with YOLO-format object detection annotations.
- `Verified from source page`: it claims images cover varying lighting conditions and angles resembling grocery stores, farms, and storage facilities.
- `Inference / recommendation`: this is narrow in class coverage but valuable for robustness testing on lighting and freshness variation.
- Recommended bucket: `supplement` for fruit-specific robustness, not general backbone use.

### Additional dish-focused candidates

#### 7. Food Image Dataset (Indian dishes)
- URL: [Food Image Dataset](https://www.kaggle.com/datasets/josephvettom/food-image-dataset)
- `Verified from source page`: dataset page describes `20` Indian food categories with YOLO-style labels.
- `Verified from source page`: license is `CC BY-SA 4.0`.
- `Inference / recommendation`: cuisine mismatch means this should not anchor Vietnamese dish taxonomy, but it can still be useful as a negative-transfer experiment or as a holdout to study dish-domain transfer.
- Recommended bucket: `hold` for current V1, maybe `supplement` later for cross-cuisine robustness experiments.

### Practical recommendation on dataset count
- `Inference / recommendation`: more datasets are not automatically better.
- `Inference / recommendation`: adding too many datasets too early usually hurts because of:
  - inconsistent label semantics
  - mixed annotation quality
  - domain mismatch
  - class imbalance
  - duplicated or near-duplicated imagery
  - conflicting notions of what counts as a dish vs an ingredient
- `Inference / recommendation`: the better strategy is:
  1. choose a small `core` set with strong label trust
  2. add only one `supplement` source at a time
  3. re-benchmark after each addition on the same golden benchmark set
  4. keep a source only if it improves real-photo performance

### Default recommendation for current project
- `Inference / recommendation`: do **not** train on every discovered dataset.
- `Inference / recommendation`: start with this candidate stack:
  - `dish core`: VietFood67
  - `dish supplement`: Roboflow Vietnamese Food
  - `ingredient core`: FOOD-INGREDIENTS v4
  - `ingredient supplement`: Ingredient Detection by Foody
  - `produce supplement`: Grocery Store or LVIS Fruits And Vegetables
- `Inference / recommendation`: keep Supermarket Items, Fruits & Vegetable Detection for YOLOv4, and Indian Food on `hold` until provenance, label consistency, and incremental benchmark value are confirmed.

## Dataset Scoring Framework

### Scoring rubric
- `Inference / recommendation`: score every candidate dataset on a `1-5` scale for:
  - accessibility stability
  - object detection validity
  - YOLO11 export readiness
  - split readiness
  - class relevance to V1
  - license clarity
  - closeness to real phone-photo conditions
  - expected label quality

### Decision buckets
- `Inference / recommendation`: assign each dataset to exactly one bucket:
  - `core`: suitable as a training backbone
  - `supplement`: useful only for selected classes
  - `hold`: not ready or too noisy for current use

### Recommended default scoring table

| Dataset | Role | Accessibility | Detection Fit | Split Readiness | License Clarity | Real-Photo Closeness | Initial Bucket |
|---|---|---:|---:|---:|---:|---:|---|
| VietFood67 | dish | 4 | 5 | 3 | 2 | 4 | core |
| Roboflow Vietnamese Food | dish | 5 | 4 | 4 | 5 | 4 | supplement |
| FOOD-INGREDIENTS v4 | ingredient | 5 | 5 | 5 | 2 | 3 | core |

### Usage rule
- `Inference / recommendation`: no dataset enters the train pipeline unless its label semantics, split shape, and quality level are explicitly accepted.

## Taxonomy Draft

### Rules
- `Inference / recommendation`: canonical class keys should be lowercase and ASCII-safe.
- `Inference / recommendation`: Vietnamese aliases should live in alias fields, not in canonical keys.
- `Inference / recommendation`: broad or visually weak classes should be removed rather than forced into V1.

### Proposed `dish/*` core
- `dish/pho`
- `dish/banh_mi`
- `dish/bun`
- `dish/goi_cuon`
- `dish/com_tam`
- `dish/hu_tieu`
- `dish/mi_quang`
- `dish/banh_xeo`
- `dish/bun_bo_hue`
- `dish/banh_cuon`
- `dish/bun_cha`
- `dish/com_ga`
- `dish/com_chien`
- `dish/chao`
- `dish/banh_trang_tron`

### Proposed `ingredient/*` core
- `ingredient/beef`
- `ingredient/chicken`
- `ingredient/pork`
- `ingredient/fish`
- `ingredient/shrimp`
- `ingredient/egg`
- `ingredient/rice`
- `ingredient/tomato`
- `ingredient/onion`
- `ingredient/spring_onion`
- `ingredient/garlic`
- `ingredient/ginger`
- `ingredient/cabbage`
- `ingredient/carrot`
- `ingredient/cucumber`
- `ingredient/potato`
- `ingredient/spinach`
- `ingredient/lettuce`
- `ingredient/coriander`
- `ingredient/lemon`
- `ingredient/chili_or_pepper`
- `ingredient/beans`
- `ingredient/peas`
- `ingredient/chickpeas`
- `ingredient/peanut`

### Alias requirements
- `Inference / recommendation`: every retained class should define:
  - canonical key
  - English aliases
  - Vietnamese aliases
  - source mappings
  - status of `keep`, `group`, or `drop`

### Current `best.pt` class disposition
- `Verified from repo`: classes such as `beef`, `chicken`, `fish`, `shrimp`, `rice`, `tomato`, `onion`, `spring_onion`, `garlic`, `ginger`, `cabbage`, `carrot`, `cucumber`, `potato`, `spinach`, `lettuce`, `lemon`, `peas`, and `peanut` map cleanly into the proposed ingredient core.
- `Inference / recommendation`: ambiguous or visually weak classes like `salad`, `salt`, and `curry_powder` should likely be removed from V1.
- `Inference / recommendation`: many fruit-only classes should be deferred unless product usage proves they matter.

## Golden Benchmark Set

### Purpose
- `Inference / recommendation`: create a benchmark set that represents the actual success target better than public validation alone.
- `Inference / recommendation`: this set decides which model wins.

### Required composition
- `Inference / recommendation`: the set should include 3 groups:
  - full dish photos
  - single-ingredient photos
  - difficult real-phone photos with poor lighting, clutter, awkward angles, or mixed plating

### Quality requirements
- `Inference / recommendation`: every benchmark image should have manually reviewed labels.
- `Inference / recommendation`: benchmark labels should be cleaner than training labels, because this set is the model-selection authority.
- `Inference / recommendation`: public validation images must not be reused as the golden benchmark set.

### Benchmark questions the set must answer
- Can the model identify the main dish correctly?
- Does it miss important ingredients that matter to nutrition logic?
- Does it hallucinate food objects in cluttered scenes?
- Does performance drop sharply on real phone-camera conditions?

## Data Strategy

### Backbone choice
- `Inference / recommendation`: use VietFood67 for `dish/*`.
- `Inference / recommendation`: use FOOD-INGREDIENTS v4 for `ingredient/*`.
- `Inference / recommendation`: use Roboflow Vietnamese Food as a supplement and benchmark source.

### Merge strategy
- `Inference / recommendation`: create one canonical class registry first, including canonical key, namespace, aliases, source mappings, and keep-or-drop status.
- `Inference / recommendation`: ingest each dataset separately into an intermediate manifest before any merge.
- `Inference / recommendation`: remap every source label into canonical taxonomy with no silent passthrough of uncertain labels.
- `Inference / recommendation`: build a fresh `train`, `val`, and `test` split for the merged dataset.

### Anti-noise rules
- `Inference / recommendation`: do not merge labels only because they look similar.
- `Inference / recommendation`: keep dish and ingredient labels separate even when they co-occur in the same photo.
- `Inference / recommendation`: drop visually weak spices, powders, or broad classes from V1 unless there is strong evidence they are reliably detectable.
- `Inference / recommendation`: if a source class is too broad, mark it for drop instead of inventing semantics.

### Collision rule examples
- `Inference / recommendation`: if a class represents a prepared dish, it must not be remapped into `ingredient/*`.
- `Inference / recommendation`: if a class represents a raw component, it must not be remapped into `dish/*`.
- `Inference / recommendation`: classes like `bun` require sample inspection before deciding whether they are dish, ingredient, or too ambiguous to keep.

### App-captured images
- `Inference / recommendation`: real app photos should be added only after label guidelines exist and only as a second-stage fine-tune dataset, not as the initial public-data baseline.

## YOLO11 Benchmark And Training Strategy

### Why `Colab-first`
- `Verified from repo`: current local training scripts include Windows-specific workarounds such as `workers=0`.
- `Verified from repo`: `continue_training.py` exists because local Windows training has multiprocessing constraints.
- `Inference / recommendation`: Colab-first is the safest default for repeatable YOLO11 benchmarking before worrying about local training ergonomics.

### YOLO11 feasibility
- `Verified from source page`: Ultralytics documents YOLO11 detection variants `yolo11n.pt`, `yolo11s.pt`, `yolo11m.pt`, `yolo11l.pt`, and `yolo11x.pt`.
- `Verified from source page`: the YOLO11 model docs show support for training, validation, inference, and export.
- `Verified from source page`: the Train and Val docs describe the standard custom-training and validation workflow for object detection.

### Candidate order
- `Inference / recommendation`: use the following benchmark order:
  1. `yolo11s.pt` to validate taxonomy and merge quality quickly
  2. `yolo11m.pt` as the main candidate
  3. `yolo11l.pt` as the accuracy-first candidate if `m` is still insufficient
- `Inference / recommendation`: do not prioritize `yolo11x.pt` in the first phase unless compute headroom is abundant.

### Training phases
- `Inference / recommendation`: Phase 1 should train only on the curated merged public dataset.
- `Inference / recommendation`: Phase 2 should fine-tune with app-like images if Phase 1 is stable.

### Required metrics
- `Inference / recommendation`: every benchmark run must record:
  - `mAP50`
  - `mAP75`
  - `mAP50-95`
  - precision
  - recall
  - dish-only recall
  - ingredient-only recall
  - top confusion pairs

### Required artifacts per run
- `Inference / recommendation`: every run must preserve:
  - training config
  - final `data.yaml`
  - best weights
  - confusion matrix
  - per-class metrics
  - representative false positives
  - representative false negatives

### Benchmark matrix

| Run | Backbone | Dataset | Goal |
|---|---|---|---|
| A1 | `yolo11s.pt` | public merged core | validate pipeline and label quality |
| A2 | `yolo11m.pt` | public merged core | main candidate benchmark |
| A3 | `yolo11l.pt` | public merged core | accuracy-first comparison |
| B1 | `yolo11m.pt` | public merged core + app fine-tune | likely production candidate |
| B2 | `yolo11l.pt` | public merged core + app fine-tune | final accuracy challenge run |

### Model selection rule
- `Inference / recommendation`: choose the winner in this order:
  1. best recall of the main dish on the golden benchmark set
  2. lowest false-positive rate on realistic meal photos
  3. strongest `mAP50-95`
  4. acceptable inference speed for runtime use

### Runtime compatibility
- `Verified from repo`: runtime currently expects `best.pt`.
- `Inference / recommendation`: even if Colab produces run-named artifacts, the final selected deploy artifact should still land in the runtime-compatible `best.pt` path.

## How Production Apps Make This Work Better

### Core observation
- `Verified from source page`: food-recognition literature consistently treats this as a multi-stage problem, not a single perfect detector problem. Relevant summaries include:
  - [Healthcare review on food recognition and volume estimation](https://www.mdpi.com/2227-9032/9/12/1676)
  - [Nutrition review on food image recognition systems](https://www.mdpi.com/2072-6643/16/15/2573/html)
  - [Scoping review of image-based calorie and food logging systems](https://pmc.ncbi.nlm.nih.gov/articles/PMC11983398/)
- `Inference / recommendation`: strong user-facing apps usually combine detection, classification, fallback UX, and user correction instead of trusting one model blindly.

### What apps usually do

#### 1. Detect or segment food first
- `Verified from source page`: research reviews repeatedly highlight segmentation or region isolation as important for meal recognition and calorie estimation.
- `Inference / recommendation`: practical systems first isolate the food region, then classify or analyze it, instead of predicting on the whole scene with full background clutter.
- `Inference / recommendation`: for EatFitAI, YOLO11 should primarily serve as the robust first-pass detector of food regions and high-confidence classes.

#### 2. Use top-k thinking instead of one-label absolutism
- `Verified from source page`: food-recognition papers and app-style evaluations often report `top-1` and `top-5` style metrics rather than assuming perfect single-label certainty in all cases.
- `Inference / recommendation`: production systems often keep several plausible candidates internally, even if the UI shows only one best guess at first.
- `Inference / recommendation`: for EatFitAI, the system should preserve top candidates for low-confidence cases instead of forcing a single hard label too early.

#### 3. Handle unknown items explicitly
- `Verified from source page`: literature on mobile food logging repeatedly shows real-world images contain ambiguity, mixed dishes, occlusion, and domain mismatch.
- `Inference / recommendation`: better apps prefer “I am not sure” or “choose from suggestions” over confidently wrong outputs.
- `Inference / recommendation`: unknown handling is a feature, not a weakness, because it protects trust.

#### 4. Separate recognition from nutrition estimation
- `Verified from source page`: reviews on calorie estimation note that identifying the dish and estimating portion or calories are different problems and often require extra steps.
- `Inference / recommendation`: the strongest user experience does not require YOLO11 to solve all nutrition logic by itself.
- `Inference / recommendation`: a better design is:
  - detect likely food items
  - classify or shortlist likely dishes
  - map to nutrition database entries
  - ask for correction only when confidence is weak

#### 5. Use user correction as training signal
- `Verified from source page`: food-logging systems often rely on some human correction or selection step to improve usable accuracy.
- `Inference / recommendation`: apps become more useful when users can quickly confirm, replace, or edit a prediction rather than re-enter everything from scratch.
- `Inference / recommendation`: corrected outputs should become future hard examples for fine-tuning and benchmark expansion.

### Why a single YOLO model is not enough
- `Inference / recommendation`: if one model is asked to cover every dish, every ingredient, every angle, every lighting condition, and every unknown food, quality usually degrades.
- `Inference / recommendation`: the strongest practical pattern is a pipeline:
  1. detection of food regions and high-confidence known classes
  2. candidate ranking or top-k classification for ambiguous dishes
  3. unknown fallback when confidence is weak
  4. lightweight user confirmation or correction
  5. nutrition lookup and serving estimation after recognition

### What is most convenient for users
- `Inference / recommendation`: the best UX is not “always auto-commit the model answer”.
- `Inference / recommendation`: the best UX is:
  - auto-fill when confidence is high
  - show a short ranked suggestion list when confidence is medium
  - ask for quick correction only when confidence is low
- `Inference / recommendation`: this minimizes typing while still protecting trust.

### Strongest detection strategy for EatFitAI
- `Inference / recommendation`: use YOLO11 as the high-recall, high-precision first-stage detector for:
  - core dishes
  - core ingredients
  - food-region localization
- `Inference / recommendation`: add a second-stage candidate ranking path for ambiguous dish recognition instead of forcing YOLO11 alone to solve every edge case.
- `Inference / recommendation`: keep an explicit `unknown` path or low-confidence fallback, rather than turning every unfamiliar dish into the nearest known class.

### Recommended product architecture for best practical results
- `Inference / recommendation`: the strongest near-term architecture for EatFitAI is:
  1. `YOLO11 detector`
     - detect food regions and high-confidence known classes
  2. `dish candidate ranker`
     - handle ambiguous dish-level decisions and top-k outputs
  3. `ingredient mapper`
     - convert ingredient detections into nutrition-relevant entities
  4. `confidence gate`
     - auto-accept, suggest, or ask the user
  5. `correction memory`
     - store corrected cases for future benchmark and fine-tune use

### Concrete implication for this research
- `Inference / recommendation`: the best possible user result does not come from maximizing dataset count alone.
- `Inference / recommendation`: it comes from maximizing:
  - label quality
  - benchmark realism
  - confidence calibration
  - correction workflow quality
  - incremental learning from real user mistakes

## Optimization Loop

### Loop 1: prove the pipeline
- `Inference / recommendation`: train on a clean public merged dataset to confirm taxonomy, remapping, and benchmark instrumentation.

### Loop 2: analyze failures
- `Inference / recommendation`: review confusion matrix and false cases, then focus only on the classes with the worst confusion and highest real-photo miss rate.

### Loop 3: add real-photo signal
- `Inference / recommendation`: collect and label app-like images only for weak classes, then fine-tune the strongest candidate.

### Loop 4: re-benchmark without changing the rules
- `Inference / recommendation`: evaluate again using the same golden benchmark set and same model-selection criteria.

### Expansion rule
- `Inference / recommendation`: do not add more classes until the core set is stable on real-photo benchmarks.

## Risks And Validation

### Main risks
- `Inference / recommendation`: dataset semantic collision between dishes and ingredients.
- `Inference / recommendation`: runtime regression if artifact assumptions or health metadata are changed carelessly.
- `Inference / recommendation`: class-count explosion if V1 keeps too many old and new labels at once.
- `Inference / recommendation`: public-data domain gap vs actual EatFitAI uploads.
- `Inference / recommendation`: UTF-8 and mojibake corruption in future taxonomy or alias files.
- `Inference / recommendation`: noisy labels for tiny or visually weak ingredients.

### Validation checklist before training
- `Inference / recommendation`: every dataset is scored and bucketed as `core`, `supplement`, or `hold`.
- `Inference / recommendation`: taxonomy has no unresolved ambiguous classes.
- `Inference / recommendation`: the golden benchmark set exists and covers the 3 required image groups.
- `Inference / recommendation`: the same benchmark split will be used for `yolo11s`, `yolo11m`, and `yolo11l`.

### Validation checklist during benchmarking
- `Inference / recommendation`: compare confusion between visually similar dishes and ingredients.
- `Inference / recommendation`: track not only mAP but also main-dish recall and false positives on realistic photos.

### Acceptance criteria
- `Inference / recommendation`: the research output clearly distinguishes trusted datasets from candidate-only datasets.
- `Inference / recommendation`: the golden benchmark set is sufficient to choose a model based on real-photo performance.
- `Inference / recommendation`: there is a clear decision rule for staying on `yolo11m` or escalating to `yolo11l`.
- `Inference / recommendation`: model selection does not depend on public mAP alone.

## Implementation-Ready Next Steps

### Step order
1. Confirm the baseline `best.pt` and preserve its class inventory as the reference input.
2. Score the candidate datasets and lock the `core`, `supplement`, and `hold` buckets.
3. Finalize the V1 taxonomy and class registry.
4. Build the golden benchmark set.
5. Create the merged public dataset and final `data.yaml`.
6. Benchmark `yolo11s`, then `yolo11m`, then `yolo11l` if needed.
7. Fine-tune the strongest candidate with app-like images.
8. Select a final deploy candidate and preserve runtime compatibility through `best.pt`.

### Expected repo areas to change later
- `ai-provider/app.py`
- `ai-provider/README.md`
- `ai-provider/train_local.py` or its replacement
- root-level YOLO scripts if they are deprecated or replaced
- new taxonomy and dataset manifest assets
- benchmark-set and scoring documentation assets

### Definition of ready
- `Inference / recommendation`: another engineer should be able to read this file alone and begin implementation without needing additional high-level decisions about dataset selection, scoring method, taxonomy shape, benchmark design, training lane, or final model-selection rules.
