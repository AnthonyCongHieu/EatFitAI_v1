# Branch B B0 Implementation Contract - 2026-05-08

## Scope

Branch B is implemented against the current `hieu_deploy/production` branch, dev cloud first. Production data or services must not be changed unless a separate explicit command is given.

## Date Rule

Day-level features use the user's local calendar date supplied by the client. Backend endpoints accept `DateOnly`/local date inputs and avoid counting arbitrary UTC log presence as a complete day.

## Day Completeness

A day is complete only when it has at least two distinct main meal types (`breakfast`, `lunch`, `dinner`) and at least 800 kcal. Snack-only or one-small-meal days remain `partial` and do not count toward streaks, weekly review readiness, lapse recovery, or adaptive target learning.

## Food Trust

Missing nutrients are tracked separately from numeric macro values. Provider/barcode foods may still store `0` in legacy numeric macro columns, but `missingNutrients`, `nutrientCompletenessScore`, `trustSummary`, and `trustDetails` tell the app whether that zero is a true value or needs review.

## Adaptive Safety

Adaptive targets use complete days only, require at least 14 complete days, enforce calorie floors/ceiling, and return the current target unchanged when `HasEDRisk` is true.

## Rollout

Code migration is tracked in repo as an additive, idempotent migration. Apply it to dev Supabase first, verify backend health, then deploy dev Render services and run smoke tests before any production rollout.

## Encoding

Touched user-facing Vietnamese strings must remain valid UTF-8. Mojibake discovered in touched files should be corrected locally and verified by test or targeted review.
