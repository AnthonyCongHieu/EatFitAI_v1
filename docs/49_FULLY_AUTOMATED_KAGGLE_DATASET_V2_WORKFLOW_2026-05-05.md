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

## Cloud-Only Decision

If local raw downloads are not allowed, use a Google Colab cloud bridge:

1. Colab mounts private Google Drive in `/content/drive`.
2. `ai-provider/dataset_v2/colab_cloud_bridge.py` packages Drive raw zips into a private Kaggle dataset from Colab temp storage.
3. The same bridge versions the Kaggle pipeline-code dataset and pushes the raw-audit kernel.
4. Kaggle runs raw audit and writes outputs back to the user's Kaggle account.
5. The bridge can poll and copy kernel outputs back to Drive.

This keeps raw zips out of the local machine. Local Codex remains for source-code edits, tests, and small Kaggle API checks only.

## Public Drive Direct Path

If the Drive raw folder is temporarily public by link, Kaggle can download raw zips directly:

1. Keep `public_drive_raw_sources.csv` as the exact allow-list of raw zip file IDs.
2. Version the private Kaggle pipeline-code dataset.
3. Push `kaggle_public_drive_raw_audit_kernel.py`.
4. The kernel installs `gdown`, downloads only allow-listed raw zips into Kaggle working storage, and runs raw audit/sample grid generation.
5. Download Kaggle output reports and then revoke public Drive sharing.

This path avoids both local raw downloads and Colab. It is operationally easiest, but Drive links should be public only for the audit window.

## Current Decision

Proceed with Kaggle-first automation.

Use Colab only as the private Drive-to-Kaggle bridge when local raw data is disallowed.

## Safe Token Policy

The API token has appeared in a screenshot/chat context. After the automation is working, rotate it in Kaggle settings.

