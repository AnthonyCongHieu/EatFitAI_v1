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

## Components
Use full-body MoChi for coaching moments so the silhouette reads as a character. Use face sprites only for compact dock states and tiny status surfaces.

## Do's and Don'ts
Do show MoChi once for a context and let users dismiss it. Do not repeat the same coach every time the user navigates back and forth. Do not use looping green pulse effects as the main visual language.
