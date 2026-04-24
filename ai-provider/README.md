# EatFitAI AI Provider

Local Python service for:

- vision detection with YOLO
- nutrition advice and meal insight via Gemini API
- cooking instructions
- voice transcription / parsing support

## Local defaults

- host: `http://127.0.0.1:5050`
- primary model file: `best.pt`
- local/debug fallback model file: `yolov8s.pt`
- default Gemini model: `gemini-2.5-flash`

## Local env file

Create `.env` from `.env.example` if needed:

```powershell
Copy-Item .\.env.example .\.env
```

Tracked example values:

```env
GEMINI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=SET_IF_YOU_WANT_TO_APPEND_ONE_MORE_PROJECT_TO_THE_POOL
GEMINI_API_KEY_PROJECT_ID=project-5
GEMINI_API_KEY_PROJECT_ALIAS=gemini-backup-5
GEMINI_API_KEY_ALIAS=slot-extra
GEMINI_EXTRA_KEY_POOL_JSON=[{"projectAlias":"gemini-backup-6","projectId":"project-6","keyAlias":"slot-extra-2","apiKey":"replace_me_too","model":"gemini-2.5-flash","enabled":true}]
GEMINI_EXHAUSTED_PROJECT_IDS=project-1,project-2,project-3,project-4
GEMINI_EXHAUSTED_UNTIL=
GEMINI_RPM_LIMIT=5
GEMINI_TPM_LIMIT=250000
GEMINI_RPD_LIMIT=20
GEMINI_USAGE_STATE_PATH=uploads/gemini-usage-state.json
GEMINI_PROBE_MIN_INTERVAL_SECONDS=600
GEMINI_PROBE_MAX_PER_PROJECT_PER_DAY=3
GEMINI_PROBE_PROMPT=ping
GEMINI_KEY_POOL_JSON=[{"projectAlias":"gemini-primary","projectId":"project-1","keyAlias":"slot-a","apiKey":"replace_me","model":"gemini-2.5-flash","enabled":true}]
ENABLE_STT=false
ALLOW_GENERIC_YOLO_FALLBACK=false
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```

If both `GEMINI_KEY_POOL_JSON` and `GEMINI_API_KEY` are set, the single key is appended as one more pool entry. Use `GEMINI_API_KEY_PROJECT_ID` with a new Gemini project so quota rotation treats it as an independent source.

Use `GEMINI_EXTRA_KEY_POOL_JSON` when you need one or more extra backup keys beyond the legacy append slot. This keeps the live pool at 6 keys without rewriting the main Render secret every time.

If the existing pool is already rate-limited, set `GEMINI_EXHAUSTED_PROJECT_IDS` so the service starts with operator evidence for those project IDs. The override is bootstrap state only: once that reset window passes, the entry moves into a pending-probe state and must be revalidated before the pool will route traffic back to it.

`GEMINI_RPM_LIMIT`, `GEMINI_TPM_LIMIT`, and `GEMINI_RPD_LIMIT` are enforced locally per project before each request. The pool uses a rolling 60-second window for RPM and TPM, resets RPD at Pacific midnight, rotates to the next project immediately when any one limit is exhausted, and persists counters plus recovery timestamps to `GEMINI_USAGE_STATE_PATH`.

`GEMINI_PROBE_MIN_INTERVAL_SECONDS`, `GEMINI_PROBE_MAX_PER_PROJECT_PER_DAY`, and `GEMINI_PROBE_PROMPT` control the bounded revalidation path. The probe only runs when a project is pending verification after a daily reset or after an exhausted project reaches its expected provider reset window.

`ENABLE_STT=false` is the recommended local default for Android smoke/debug lanes so the service can boot quickly without downloading the PhoWhisper model. Set it to `true` only when you are explicitly validating voice transcription. `ROBOFLOW_API_KEY` is only required when you run `download_dataset.py`.

## Start locally

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

## Required assets

- `best.pt` should be present when you want the custom Vietnamese-food model
- production requires `best.pt`; on Render, configure `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` so the service can download `best.pt` from the `ml-models` bucket
- `yolov8s.pt` can act as a local/debug fallback only when `ALLOW_GENERIC_YOLO_FALLBACK=true`

`best.pt` is intentionally not committed to git.

## Health check

```powershell
curl http://127.0.0.1:5050/healthz
```

Expected fields include:

- `status`
- `model_loaded`
- `model_file`
- `model_load_error`
- `generic_yolo_fallback_allowed`
- `device`
- `cuda_available`
- `gemini_usage_entries`
- `gemini_retry_after`
- `gemini_probe_pending_project_count`
- `gemini_provider_exhausted_project_count`
- `gemini_auth_invalid_project_count`

For a Gemini-only quota export, call:

```powershell
curl http://127.0.0.1:5050/healthz/gemini
```

Each `gemini_usage_entries` item includes:

- `state`
- `quotaSource`
- `lastProviderStatusCode`
- `lastProviderQuotaId`
- `lastProviderQuotaMetric`
- `lastProbeAt`
- `lastProbeResult`
- `nextProbeAt`
- `providerExpectedResetAt`

## Integration contract

Backend default local configuration points to:

```text
AIProvider:VisionBaseUrl = http://127.0.0.1:5050
```

The local environment is only considered ready when:

- the AI provider starts successfully
- `/healthz` responds
- Gemini is configured through `GEMINI_KEY_POOL_JSON` or `GEMINI_API_KEY`

## Notes

- Use `gemini-2.5-flash` as the default Gemini model unless a benchmark explicitly changes the team baseline.
- This service is required for the emulator-first local lane described in the root setup guide.
