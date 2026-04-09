# EatFitAI AI Provider

Local Python service for:

- vision detection with YOLO
- nutrition advice and meal insight via Gemini API
- cooking instructions
- voice transcription / parsing support

## Local defaults

- host: `http://127.0.0.1:5050`
- primary model file: `best.pt`
- fallback model file: `yolov8s.pt`
- default Gemini model: `gemini-2.5-flash`

## Local env file

Create `.env` from `.env.example` if needed:

```powershell
Copy-Item .\.env.example .\.env
```

Tracked example values:

```env
GEMINI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=SET_ONLY_IF_YOU_USE_SINGLE_KEY_FALLBACK
GEMINI_KEY_POOL_JSON=[{"projectAlias":"gemini-primary","projectId":"project-1","keyAlias":"slot-a","apiKey":"replace_me","model":"gemini-2.5-flash","enabled":true}]
ENABLE_STT=false
```

`ENABLE_STT=false` is the recommended local default for the emulator/Appium lane so the service can boot quickly without downloading the PhoWhisper model. Set it to `true` only when you are explicitly validating voice transcription. `ROBOFLOW_API_KEY` is only required when you run `download_dataset.py`.

## Start locally

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

## Required assets

- `best.pt` should be present when you want the custom Vietnamese-food model
- `yolov8s.pt` can act as the local fallback

`best.pt` is intentionally not committed to git.

## Health check

```powershell
curl http://127.0.0.1:5050/healthz
```

Expected fields include:

- `status`
- `model_loaded`
- `model_file`
- `device`
- `cuda_available`

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
