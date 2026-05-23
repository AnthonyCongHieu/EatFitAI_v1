# Voice Variants Parser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve EatFitAI voice so common Vietnamese natural phrases parse and execute reliably on the cloud backend.

**Architecture:** Keep the existing backend-first hybrid pipeline. Extend the deterministic C# rule parser for high-confidence common phrases, keep review-required flows for write actions, and verify with a cloud smoke matrix after deploy.

**Tech Stack:** ASP.NET Core 9, xUnit, React Native/Expo client contracts, Lightsail systemd deployment.

---

### Task 1: Backend Parser Coverage

**Files:**
- Create: `eatfitai-backend/Tests/Unit/Services/VoiceProcessingServiceTests.cs`
- Modify: `eatfitai-backend/Services/VoiceProcessingService.cs`

- [ ] Write failing tests for natural add-food, weight variants, Vietnamese number words, STT spacing/noise, nutrition, query meal, repeat meal, and notes.
- [ ] Run `dotnet test .\eatfitai-backend\EatFitAI.API.Tests.csproj --filter FullyQualifiedName~VoiceProcessingServiceTests`.
- [ ] Implement parser helpers for normalization, Vietnamese number parsing, flexible meal/date stripping, and safer food extraction.
- [ ] Re-run the targeted parser tests.

### Task 2: Command Catalog Accuracy

**Files:**
- Modify: `eatfitai-backend/Controllers/VoiceController.cs`
- Modify: `eatfitai-backend/Tests/Integration/Controllers/VoiceControllerTests.cs`

- [ ] Add integration assertion that `/api/voice/commands` advertises all supported intents.
- [ ] Update the command catalog to include `ASK_NUTRITION`, `QUERY_MEAL`, `REPEAT_MEAL`, and `ADD_NOTE` with concise Vietnamese examples.
- [ ] Run the targeted integration test.

### Task 3: Verification And Deploy

**Files:**
- Create: `_logs/production-smoke/voice-cloud-variants-20260523/voice-cloud-variants-report.json`

- [ ] Run backend parser and voice controller tests.
- [ ] Run existing mobile voice tests to catch contract regressions.
- [ ] Publish backend to Lightsail, restart `eatfitai-backend`, and check `NRestarts=0`.
- [ ] Run cloud matrix smoke against `https://eatfitai-api.duckdns.org` for parse/review/commit/readback/transcribe.
