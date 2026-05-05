# Fully Automated Dataset V2 Workflow Research

Date: 2026-05-05 Asia/Saigon

## Verified Locally

Kaggle authentication is available on this machine through:

```text
C:\Users\PC\.kaggle\access_token
```

The Python Kaggle API authenticated successfully and can search datasets. Do not copy the token into repo files, notebooks, scripts, or command history.

## Best Fully Automated Architecture

Use Kaggle as the compute orchestrator instead of Colab:

1. Create or version a Kaggle dataset that contains raw source zips.
2. Push a Kaggle builder/audit kernel that attaches that raw-zips dataset.
3. Kernel runs:
   - raw zip audit
   - bbox sample grid generation
   - class candidate report
   - source decision draft
   - clean dataset build only after hard gates
   - validation
   - dataset packaging
4. Create/version a second Kaggle dataset for `eatfitai_clean_v1`.
5. Push a training kernel that attaches `eatfitai_clean_v1`.
6. Training kernel runs smoke train first, then YOLO11m full train only if gates pass.
7. Pull kernel outputs automatically with Kaggle API.

This removes Colab from the critical path.

## Main Blocker

Kaggle cannot mount private Google Drive like Colab.

Therefore Drive raw zips must reach Kaggle by one of these routes:

1. Preferred: create a Kaggle raw-zips dataset from local/connector-downloaded Drive files.
2. Alternative: make Drive raw zip files public and let Kaggle kernel download them by file ID with `gdown`.
3. Alternative: run a one-time Colab bridge to copy Drive zips into a Kaggle dataset.
4. Future: use Google Drive API credentials/service account inside the Kaggle kernel, but this adds secret management complexity.

## Kaggle API Capabilities Confirmed By Docs/Runtime

The installed Kaggle Python package exposes:

```text
dataset_create_new(folder, public=False, ...)
kernels_push(folder, ...)
kernels_status(kernel)
kernels_output(kernel, path, ...)
dataset_list(search=..., page=...)
```

This is sufficient for:

- creating raw/clean datasets,
- pushing audit/train kernels,
- polling status,
- downloading outputs.

## Current Decision

Proceed with Kaggle-first automation.

Do not depend on Colab unless the private Drive transfer becomes the only practical route.

## Safe Token Policy

The API token has appeared in a screenshot/chat context. After the automation is working, rotate it in Kaggle settings.

