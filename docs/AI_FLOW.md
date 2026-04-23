# EatFitAI AI Flow

Updated: `2026-04-23`

Tai lieu nay mo ta runtime AI hien tai cua repo. Khi co khac biet, uu tien:

- `docs/ARCHITECTURE.md`
- `docs/TESTING_AND_RELEASE.md`
- `ai-provider/README.md`

## 1. Runtime Overview

Current production-shaped flow:

- Mobile does not call the AI provider directly for app features.
- Vision and voice go through the .NET backend first.
- The AI provider is a Flask service that hosts YOLO vision plus Gemini-backed nutrition, cooking, and voice parsing support.
- Local STT is disabled by default with `ENABLE_STT=false`; Whisper is not the default active runtime path.

High-level path:

```text
Mobile -> Backend API -> AI Provider -> Backend API -> Mobile
```

## 2. Active AI Stack

- Vision detection: YOLO (`best.pt`, fallback `yolov8s.pt`)
- Nutrition / meal insight: Gemini-first
- Cooking instructions: Gemini-first with fallback behavior in app/backend
- Voice parse: backend proxy to AI provider, with backend rule fallback when needed
- Voice transcribe: backend-owned endpoint, with STT disabled by default in local lanes

## 3. Vision Flow

Primary route:

- Mobile -> `POST /api/ai/vision/detect`

Current behavior:

1. Mobile uploads an image to the backend.
2. Backend validates auth, rate limits, and request size.
3. Backend checks vision cache.
4. Backend proxies the image to AI provider `POST /detect`.
5. AI provider runs YOLO and returns raw detections.
6. Backend maps detections into food items and returns `VisionDetectResultDto`.
7. Backend may cache the mapped result for later reuse.

Related support flows:

- Teach/correction flows stay backend-owned.
- Barcode lookup is a separate catalog/provider flow via `/api/food/barcode/{barcode}`.

## 4. Nutrition Flow

Nutrition is Gemini-first in the current branch.

Primary responsibilities:

- nutrition advice
- meal insight
- macro-aware suggestions
- formula fallback when AI is unavailable

Current pattern:

1. Mobile calls backend AI endpoints.
2. Backend prepares user/profile/meal context.
3. Backend or AI provider calls Gemini-based nutrition logic.
4. Response includes either Gemini-backed output or explicit fallback/formula metadata.

Important note:

- Do not treat Ollama as the default runtime nutrition engine in this repo state.

## 5. Voice Flow

Voice is backend-proxied.

Primary backend routes:

- `POST /api/voice/transcribe`
- `POST /api/voice/parse`
- `POST /api/voice/execute`
- `POST /api/voice/confirm-weight`

Current behavior:

1. Mobile sends voice input or text to backend routes.
2. Backend proxies parse work to AI provider when available.
3. If provider output is incomplete or unavailable, backend falls back to rule-based parsing.
4. Backend executes supported intents such as diary add flows.

Important note:

- Whisper/STT should be considered optional infrastructure, not the default local runtime path.

## 6. Cooking And Recipe Guidance

Cooking instructions and recipe-adjacent AI outputs are Gemini-first.

Current pattern:

1. Mobile requests suggestions through backend.
2. Backend assembles context.
3. AI provider returns Gemini-backed output when available.
4. Backend/mobile can fall back to deterministic instructions when AI is unavailable.

## 7. Health And Reliability Signals

Current backend / provider health surfaces:

- `GET /api/ai/status`
- `GET /healthz`
- `GET /healthz/gemini`

Release evidence and smoke expectations are documented in:

- `docs/TESTING_AND_RELEASE.md`

## 8. Non-Goals For This Doc

This file does not attempt to preserve the old generated diagrams for:

- Ollama-first nutrition
- Whisper-first voice
- direct mobile-to-provider runtime calls

Those are historical and should not be used as source of truth for the current branch.
