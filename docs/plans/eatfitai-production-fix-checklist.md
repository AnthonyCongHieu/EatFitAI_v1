# EatFitAI production fix checklist

## Navigation crash
- [x] Inspect bottom command bar navigation path.
- [x] Replace stack command navigation with root-safe navigation.
- [ ] Run real-device tap smoke for `Thêm bữa` and `Scan`.

## AI scan loading and review
- [x] Remove duplicate preview processing layers.
- [x] Use one production progress card with concise Vietnamese copy.
- [x] Rename scan result CTA to review-before-save.
- [ ] Capture before/after screenshots on Android.

## MoChi behavior
- [x] Auto-hide confirmation nudges after 8 seconds.
- [x] Keep live task states visible until the task finishes.
- [x] Add a dedicated compact island avatar key.
- [ ] Validate 20-minute cooldown on device/session.

## MoChi assets
- [x] Wire the compact avatar asset key safely.
- [ ] Generate GPT image source sheets matching current MoChi style.
- [ ] Crop/export full-body and head/notice variants for scan, water, meal, voice, account, empty/error, and coaching states.
- [ ] Update pose mappings after final art approval.

## Profile/settings
- [x] Remove duplicate gear from Profile.
- [x] Expose `Đăng xuất` as a visible profile row.
- [ ] Verify logout confirmation on device.

## Backend/cloud
- [x] Point Render backend AI provider config to healthy Lightsail/DuckDNS provider.
- [ ] Run authenticated `/api/ai/status`.
- [ ] Run one production image-detection smoke.
- [x] Confirm public health: Lightsail/DuckDNS API and AI provider return 200.
- [ ] Investigate Render AI provider `/healthz` 503 separately.

## Release gate
- [x] `npm run typecheck`
- [x] targeted Jest suite
- [x] backend `dotnet test`
- [x] UTF-8/mojibake scan on changed files
- [ ] Android real-device smoke
