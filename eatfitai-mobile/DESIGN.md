---
version: "alpha"
name: EatFitAI MoChi Companion
description: Design contract for MoChi as a transient game-like nutrition coach.
colors:
  background: "#0A0E1A"
  surface: "#111827"
  surface-high: "#1E2435"
  glass-panel: "#121826"
  glass-border: "#E2E8F0"
  primary: "#4BE277"
  text: "#DEE1F7"
  text-muted: "#94A3B8"
typography:
  coach-title:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: 900
    lineHeight: 14px
  coach-body:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 700
    lineHeight: 19px
rounded:
  sm: 10px
  md: 18px
  lg: 24px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
components:
  mochi-coach-stage:
    backgroundColor: "{colors.glass-panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: 12px
  mochi-dock:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: 999px
---

## Overview
MoChi is a companion coach, not a floating advertisement or a permanent badge. The character should feel like it steps into the interface for a useful moment, gives one small suggestion, and leaves.

## Colors
Accent xanh chỉ là tín hiệu. Do not fill mascot plates or large panels with saturated green. Use dark glass, slate borders, soft shadow, and small green labels or dots for attention.

## Layout
MoChi coach moments must reserve their own space or use a collision-safe overlay. They must not cover calorie numbers, date chips, primary buttons, text inputs, or the bottom command bar.

MealDiary missing-meal nudges are inline by default because the relevant empty meal card is already visible. On MealDiary, overlay is forbidden over meal cards and bottom navigation; place the coach inside the empty meal card or suppress it.

## Components
Use full-body MoChi for coaching moments so the silhouette reads as a character. Use face sprites only for compact dock states and tiny status surfaces.

## Surface Matrix
MoChi has four approved surfaces:

- Dock: always available, low-noise presence in the bottom navigation. Use for ambient companion states and tiny reactions.
- Inline: the default instructional surface. Use for empty states, low data, profile gaps, search help, recipe states, and scan review states.
- Top overlay: rare, contextual, one short actionable reminder, rendered by the shared `MoChiOverlayHost` below the safe area and route header. Use only after the policy layer confirms timing, cadence, dismiss history, and collision safety.
- System notification: outside-app reminders only. It shares the same event IDs and cadence keys as in-app nudges, and local policy can suppress backend suggestions. Foreground MoChi reminders are routed into the in-app inbox/top overlay instead of showing a second OS banner.

Contextual inline notices are expected across suitable surfaces, not only Diary: Home empty diary, Search empty/error states, Recipes, Stats low-data moments, Profile gaps, scan review states, and Notification Center empty guidance.

## First-Run Tutorial
The app-wide tutorial uses the approved A + C + D composition: a short step overview first, then a real target spotlight with a mini progress path. The tutorial is implemented by `MoChiTutorialProvider`, `MoChiTutorialHost`, and registered `MoChiTutorialTarget` anchors; individual screens must not create their own first-login tutorial overlays.

Scope v1 has exactly five steps: MoChi dock, Thêm bữa, Quét thức ăn, Uống nước, and Thống kê. Each step must point at an actual UI target, use one short warm sentence, and keep a visible `Bỏ qua` action in the top-right corner. The tutorial may open the quick-add sheet to reveal Thêm bữa and Quét thức ăn, but it must not submit food, water, or diary data on behalf of the user.

Auto-start is only for newly onboarded users through the versioned pending key. Existing users access replay from Profile via `Xem hướng dẫn MoChi`. Completion and skip are persisted with a tutorial version so a future tutorial can be introduced without nagging users on every app launch.

The mockup reference lives at `docs/mockups/mochi-tutorial-options.html`; production behavior follows option C overview plus option A spotlight plus option D mini path.

## Interruption Rules
Every MoChi moment must pass through `mochiNudgePolicy.ts` before choosing a surface.

- Critical/system: offline, failed scan, failed search, or failed backend action. Prefer toast or inline; overlay only if the user needs immediate recovery.
- Task: missing meal, hydration gap, incomplete profile, review scan result. Inline first; top overlay only when the user returned after a relevant time window and ignored a useful next action.
- Celebration: meal logged, streak, achievement. Use toast or dock reaction, not a blocking overlay.
- Ambient: companionship only. Use dock pose or tiny inline affordance, never overlay.
- Live/process: scanning, listening, searching. Exempt from daily caps, but never stack with another live MoChi message.

## Cadence
Default caps:

- Do not show the same overlay more than once per 24 hours per event key, except actionable reminder retries that remain unresolved after the retry window.
- Do not show more than two MoChi overlays in one app session.
- Do not show more than three non-error transient MoChi messages per day.
- If the user dismisses the same event twice without acting, suppress that event for three days.
- Reset session-level overlay counts when the app leaves the foreground; keep persisted daily/dismiss memory.

## Copy
Vietnamese copy must remain valid UTF-8 and body-positive. One MoChi message equals one idea plus one next action. Prefer small, practical wording like “thêm nhanh”, “xem lại”, “ghi bữa này” over guilt or pressure. Overlay body text should fit in two short lines; inline body text should fit in three lines.

## Collision Safety
Top overlays must be absolute, pointer-safe, and must not reserve layout space. They must sit below the safe area and route header, and must not cover calorie numbers, date chips, primary buttons, text inputs, the bottom navigation, or active scan controls. If a screen cannot guarantee this, downgrade to inline or keep the item in the inbox until a safe route is active.

## Do's and Don'ts
Do show MoChi once for a context and let users dismiss it. Do not repeat the same coach every time the user navigates back and forth. Do not use looping green pulse effects as the main visual language.
