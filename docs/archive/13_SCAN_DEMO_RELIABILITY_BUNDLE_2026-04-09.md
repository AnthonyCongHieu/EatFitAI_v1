# Scan Demo Reliability Bundle

Updated: `2026-04-09`

This bundle implements the first 5 execution tasks for the `scan-to-demo reliability` lane:

- `P5-03` AI regression test set
- `P5-09` critical product metrics baseline
- `P5-05` deterministic demo seed
- `P5-02` UAT cases and report templates
- `P5-04` rehearsal summary and 3-run gate

## Scope

- No new public API was added.
- Existing backend/mobile contracts remain unchanged.
- New work is limited to scripts, deterministic seed, fixtures contract, artifacts, and runbooks.
- Voice audio STT is still out of release gate. Voice gate here means `parse -> intent -> execute`.

## Commands

### 1. Seed a deterministic local demo account

```powershell
powershell -ExecutionPolicy Bypass -File .\seed-scan-demo.ps1
```

Optional overrides:

```powershell
powershell -ExecutionPolicy Bypass -File .\seed-scan-demo.ps1 `
  -Email scan-demo@redacted.local `
  -Password SET_IN_SEED_SCRIPT `
  -DisplayName "Scan Demo Reliability"
```

### 2. Start a smoke session

Cloud lane:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-mobile-cloud-smoke.ps1
```

Local seeded lane:

```powershell
$env:EATFITAI_SMOKE_EMAIL = $env:EATFITAI_DEMO_EMAIL
$env:EATFITAI_SMOKE_PASSWORD = $env:EATFITAI_DEMO_PASSWORD
npm --prefix .\eatfitai-mobile run smoke:preflight
```

### 3. Run automated regression

Read-only regression:

```powershell
npm --prefix .\eatfitai-mobile run smoke:regression
```

Allow mutating checks for the seeded local demo account:

```powershell
$env:EATFITAI_REGRESSION_ALLOW_MUTATIONS = '1'
npm --prefix .\eatfitai-mobile run smoke:regression
```

### 4. Generate metrics baseline

```powershell
npm --prefix .\eatfitai-mobile run smoke:metrics
```

### 5. Check rehearsal gate

```powershell
npm --prefix .\eatfitai-mobile run smoke:rehearsal
```

The rehearsal gate only passes when the latest 3 completed sessions all pass.

## Session Artifacts

Each smoke session now produces:

- `preflight-results.json`
- `request-budget.json`
- `fixture-manifest.json`
- `session-observations.json`
- `manual-checklist.md`
- `rehearsal-report.md`
- `regression-run.json`
- `metrics-baseline.json`
- `metrics-baseline.md`

The smoke root also receives:

- `rehearsal-summary.json`
- `rehearsal-summary.md`

## Fixture Contract

Expected fixture folder:

- `tools/appium/fixtures/scan-demo`

Required primary fixture names:

- `ai-primary-egg-01.jpg`
- `ai-primary-banana-01.jpg`
- `ai-primary-rice-01.jpg`
- `ai-primary-broccoli-01.jpg`
- `ai-primary-spinach-01.jpg`

Benchmark-only fixture names:

- `ai-benchmark-chicken-01.jpg`
- `ai-benchmark-beef-01.jpg`
- `ai-benchmark-pork-01.jpg`

## Gate Definition

`metrics-baseline.json` marks the session as rehearsal-ready only when all of these pass:

- preflight health + auth + refresh + ai status
- search regression cases
- voice parse/execute regression cases
- at least 1 primary scan regression pass
- manual `scan -> add meal -> diary readback`
- nutrition apply pass
- all 3 risk scenarios
- no crash or freeze observed
- evidence pack complete
- request budget still within limits

`rehearsal-summary.json` then checks the latest 3 sessions for consecutive pass.

## UAT + Rehearsal Templates

Use the templates in:

- [scan-demo-uat-cases.csv](/E:/tool%20edit/eatfitai_v1/docs/templates/scan-demo-uat-cases.csv)
- [scan-demo-uat-report-template.md](/E:/tool%20edit/eatfitai_v1/docs/templates/scan-demo-uat-report-template.md)
- [scan-demo-rehearsal-template.md](/E:/tool%20edit/eatfitai_v1/docs/templates/scan-demo-rehearsal-template.md)
