# Appium fixtures

Place reusable Android/Appium fixture images here when you want to automate the AI gallery flow.

Suggested file name:

- `demo-meal.jpg`

Scan demo reliability lane expects a dedicated subfolder:

- `scan-demo/ai-primary-egg-01.jpg`
- `scan-demo/ai-primary-banana-01.jpg`
- `scan-demo/ai-primary-rice-01.jpg`
- `scan-demo/ai-primary-broccoli-01.jpg`
- `scan-demo/ai-primary-spinach-01.jpg`
- `scan-demo/ai-benchmark-chicken-01.jpg`
- `scan-demo/ai-benchmark-beef-01.jpg`
- `scan-demo/ai-benchmark-pork-01.jpg`

Rules for those images:

- single dish in frame
- simple background
- low occlusion
- no collage or heavy watermark
- under `10MB`

The fixture folder stays empty in git except for `.gitkeep`; add the actual images locally.

Provision the missing scan-demo bundle from fixed Wikimedia Commons sources:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\appium\fixtures\provision-scan-demo.ps1
```

The command downloads the real images locally into `tools/appium/fixtures/scan-demo` and writes a `fixture-sources.json` file next to them for traceability.
