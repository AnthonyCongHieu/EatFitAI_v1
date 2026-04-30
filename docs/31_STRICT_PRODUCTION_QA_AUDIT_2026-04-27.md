# Strict Production QA Audit - EatFitAI - 2026-04-27

## Verdict

**Not production-ready yet.**

The audit found and fixed several production blockers, but final production approval is still blocked by unstable live scan upload/inference evidence for the chicken gallery image, notification OS-level evidence, and broader real-device regression coverage after reinstalling the latest mobile build.

Production-ready requires no P0/P1 blockers and fresh runtime evidence for every primary flow. Unknown or unverified runtime behavior is treated as failed.

## Environment

| Item | Value |
|---|---|
| Date | 2026-04-27 |
| Backend | `https://eatfitai-backend-dev.onrender.com` |
| AI provider | `https://eatfitai-ai-provider-dev.onrender.com` |
| Mobile package | `com.eatfitai.app` |
| Real device | `a12c6888629b`, Xiaomi `2201116SG` |
| .NET runtime | 10.0.7 installed locally |
| Branch | `hieu_deploy/production` |

## Fixes Applied

| Area | Fix | Commit | Result |
|---|---|---:|---|
| Scan provider | Reverted Gemini vision cascade. Scan remains YOLO-only. | `65678c1a` | Correct product direction restored. |
| YOLO detection | Added low-confidence YOLO recovery for beef/chicken. | `e9573f89` | Local beef/chicken detection restored. |
| Model egress | Packaged `ai-provider/best.pt`; stopped relying on Supabase Storage model download. | `3765bfb8` | Render no longer needs Supabase Storage for model cold start. |
| Provider speed | Added exported YOLO ONNX model and ONNX Runtime CPU inference. | `d4653fd8`, `dfc215c7` | Local ONNX detects beef/chicken in ~0.2-0.4s; live provider small images returns 200. |
| Supabase model leak | Supabase model download removed from runtime; legacy env flag no longer enables downloads. | `d4653fd8` + current audit patch | Health shows `supabase_model_download_enabled=false`. |
| Media egress | Prior live API media audit found 0 Supabase Storage URLs after R2 migration. | prior task | Catalog/user media path no longer leaks Supabase Storage URLs in sampled endpoints. |
| Chicken mapping | Seeder now recognizes Vietnamese chicken catalog names such as `uc ga`, `canh ga`, `dui ga`. | `19b3c64c` | Code fixed; live DB also received `POST /api/ai/labels/teach` for `chicken`. |
| Mobile scan payload | Scan preprocessing tuned from 1600/0.95 to 1024/0.85. | `19b3c64c` | Matches tested backend payload profile and reduces upload instability risk. |

## Evidence Matrix

| Gate | Evidence | Result | Score | Severity |
|---|---|---:|---:|---|
| AI provider tests | `python -m pytest tests -q` in `ai-provider` | 39 passed, 4 skipped | 9/10 | P2 skipped coverage |
| Backend tests | `dotnet test .\EatFitAI_v1.sln --no-restore --nologo --verbosity minimal` | 197 passed | 9/10 | P2 integration gaps |
| Mobile lint | `npm --prefix .\eatfitai-mobile run lint` | passed | 9/10 | P2 |
| Mobile typecheck | `npm --prefix .\eatfitai-mobile run typecheck` | passed | 9/10 | P2 |
| Provider health | `/healthz` | `best.onnx`, `model_loaded=true`, Supabase model download disabled | 8/10 | P1 until live scan stable |
| Backend beef scan | `/api/ai/vision/detect` with 1024/q85 beef fixture | 200, matched `beef`, `foodItemId=95` | 8/10 | P2 latency |
| Backend chicken scan | `/api/ai/vision/detect` with 1024/q85 chicken fixture | intermittent 502/reset before app log; prior 200 still unmapped before teach | 4/10 | P1 |
| Provider small fixture scan | banana/apple/orange via backend smoke path | provider logs show 200 in ~0.5-1.2s | 8/10 | P2 |
| Supabase Storage URL leak | sampled media/readback APIs | 0 Supabase Storage media URLs after R2 migration | 8/10 | P2 needs recurring guard |
| Notification flow | OS permission/channel/schedule/cancel | not revalidated in this pass | 0/10 | P1 |
| Real-device gallery scan | Xiaomi device with beef/chicken gallery images | pending reinstall of latest mobile build and manual gallery selection | 0/10 | P1 |

## Userflow Scorecard

| Userflow | Expected Behavior | Runtime Evidence | Result | Score | Decision | Next Fix |
|---|---|---|---|---:|---|---|
| Auth login | Real account can login and receive token | API login returned 200 with token | Pass API | 8/10 | Accept API, re-run device | Run `device:login-real:android` after reinstall |
| Home/navigation | All tabs render without crash | not re-run after latest build | Unknown | 0/10 | Block | Full real-device tab smoke |
| Food search | Search returns catalog/media via R2 | `chicken`, `Chicken Breast`, apple/orange tested | Partial pass | 7/10 | Conditional | Add direct regression for no Supabase URL |
| Scan beef | Gallery image should detect and map beef | backend 200, matched beef | Pass with latency warning | 8/10 | Conditional | Confirm on real device |
| Scan chicken | Gallery image should detect and map chicken | provider detects locally; live backend unstable | Fail | 4/10 | Block | Stabilize upload/provider path, verify teach map |
| Save scan to diary | Detected mapped item saves and API readback confirms row | not re-run after latest build | Unknown | 0/10 | Block | Real-device save/readback |
| Voice text | Voice command parse and diary readback | not re-run in this pass | Unknown | 0/10 | Block | Re-run `device:voice-text-readback:android` |
| Stats/profile | Stats/profile screens and APIs load | not re-run in this pass | Unknown | 0/10 | Block | Re-run `device:stats-profile-smoke:android` |
| Notifications | Toggle, permission, channel, schedule/cancel | missing OS evidence | Fail | 0/10 | Block | ADB appops/dumpsys/logcat proof |

## Supabase Egress Root Cause

Cached egress kept increasing because the earlier fix closed catalog/R2 paths but did not close every Storage path:

- User-facing live APIs previously returned some `*.supabase.co/storage/v1/object/public/user-food/...` thumbnails.
- The AI provider also still had a cold-start fallback that downloaded `best.pt` from Supabase Storage when the model was missing in the container.
- `best.pt` was present locally but ignored by git, so Render images could still miss it.

Current state:

- `best.pt` and `best.onnx` are tracked.
- Provider health reports `supabase_model_download_enabled=false`.
- Prior sampled media APIs returned 0 Supabase Storage URLs after R2 migration.

Remaining requirement:

- Keep a recurring guard that fails if any API response contains `supabase.co/storage`.
- Remove stale Supabase Storage env vars from services only after confirming no non-storage DB/admin flow depends on them.

## Performance

| Flow | Target | Observed | Decision |
|---|---:|---:|---|
| Local YOLO ONNX beef/chicken | under 2.5s | ~0.2-0.4s | Pass |
| Provider small images | under 10s | ~0.5-1.2s in logs | Pass |
| Provider/backend beef 1024/q85 | under 10s preferred | ~8-17s | Weak |
| Provider/backend chicken 1024/q85 | under 10s preferred | intermittent 502/reset | Fail |

## Broken / Weak Backlog

| Severity | Issue | Evidence | Required Fix |
|---|---|---|---|
| P1 | Chicken scan is not production-stable live | repeated 502/reset before app logs; prior unmapped result | stabilize upload/provider path and verify mapped 200 |
| P1 | Latest mobile build not installed/tested on physical device | code changed scan preprocessing | build/install and run gallery beef/chicken from library |
| P1 | Notification OS evidence missing | no fresh `appops`, `dumpsys notification`, schedule/cancel proof | run notification audit on device |
| P1 | AI provider free-tier latency too close to gateway timeout | chicken request can exceed gateway tolerance | reduce model/runtime latency or move provider off constrained free tier |
| P2 | Beef maps to seeded `Beef` with no thumbnail | backend 200 but `thumbNail=null` | add verified R2 thumbnail/catalog item |
| P2 | Gemini service still used for non-scan AI and shows transient failures | health shows failover state | keep separate from scan, but stabilize nutrition/voice paths |
| P2 | Serena cache growth question pending | .NET 10 installed; cache growth still needs root-cause review | inspect Serena/project cache behavior after QA blockers |

## Production Decision

Do not release as production-ready yet.

Required before green:

1. Install the latest mobile build on `a12c6888629b`.
2. Use gallery picker, not camera, for the existing beef and chicken images.
3. Confirm scan result maps both beef and chicken, then save to diary and verify API readback.
4. Confirm all sampled API/media responses contain 0 Supabase Storage URLs.
5. Complete notification OS permission/channel/schedule/cancel evidence.
6. Re-run real-device smoke: login, home, tabs, diary/search, scan, voice, stats/profile, backend-frontend live check.
