# Dataset V2 Source Reselection Gate

Date: 2026-05-05 Asia/Saigon

## Decision

Do not build or train from the old merged artifact. Restart from source-level selection.

The first gate is source curation:

1. Review public metadata for task type, license, image count, class count, and domain fit.
2. Mark each source as audit candidate, download candidate, cherry-pick only, quarantine, or reject.
3. Download only missing audit candidates to the new Drive raw folder.
4. Run raw zip audit in Colab/Drive.
5. Generate bbox sample grids.
6. Freeze `source_decisions.csv` from raw evidence.

## Current Public Review Output

See:

```text
ai-provider/dataset_v2/source_decisions.public_review.csv
```

## Current Drive Folder

```text
EatFitAI-Training/datasets-raw
https://drive.google.com/drive/folders/1Kf4pHiUlrYW__y4_rL3n8PBoLjPZzNYw
```

This folder already contains most old zip candidates. They are not accepted yet. They must pass raw audit and sample grid review.

## Source Policy

Use `VietFood67` only if the final training/evaluation use is compatible with its non-commercial/share-alike license. Treat it as high-value but license-risk, not a default production source.

Reject public sources whose class names encode grams/calories or other unstable labels instead of food object identity.

Do not use `11_food_detection_3.zip` or `17_food_union_fruit.zip` in the first production clean dataset because previous logs showed severe duplicate-label risk.

## Remote-First Execution

Local repo stores scripts and small CSV decisions only.

Drive/Colab/Kaggle handle heavy data:

1. Drive stores raw zips and generated reports.
2. Colab audits and builds clean dataset on disposable SSD.
3. Kaggle trains only after final audit hard gates pass.

