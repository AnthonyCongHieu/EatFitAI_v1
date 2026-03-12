# EatFitAI AI Provider

Local Python service for:

- vision detection with YOLO
- nutrition advice and meal insight via Ollama
- cooking instructions
- voice transcription / parsing support

## Local defaults

- host: `http://127.0.0.1:5050`
- primary model file: `best.pt`
- fallback model file: `yolov8s.pt`
- default Ollama model: `qwen2.5:3b`

## Local env file

Create `.env` from `.env.example` if needed:

```powershell
Copy-Item .\.env.example .\.env
```

Tracked example values:

```env
HF_TOKEN=SET_ONLY_IF_YOU_DOWNLOAD_MODELS_FROM_HUGGING_FACE
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
ENABLE_STT=false
```

`ENABLE_STT=false` is the recommended local default for the emulator/Appium lane so the service can boot quickly without downloading the PhoWhisper model. Set it to `true` only when you are explicitly validating voice transcription.

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
- Ollama is reachable when AI text features are required

## Notes

- Use `qwen2.5:3b` as the default local Ollama model unless a benchmark explicitly changes the team baseline.
- This service is required for the emulator-first local lane described in the root setup guide.
