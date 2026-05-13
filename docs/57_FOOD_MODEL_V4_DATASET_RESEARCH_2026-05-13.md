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
