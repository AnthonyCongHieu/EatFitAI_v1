# EatFitAI Download Site

Static download page for the public Android APK. It is designed for Cloudflare Pages Free while keeping the APK itself in GitHub Releases.

## Current release contract

- Version: `1.0.0`
- Android package: `com.eatfitai.app`
- GitHub release tag: `android-v1.0.0`
- APK asset name: `EatFitAI-android-v1.0.0.apk`
- APK URL:
  `https://github.com/anthonyconghieu/EatFitAI_v1/releases/download/android-v1.0.0/EatFitAI-android-v1.0.0.apk`

## Publish the APK

Build or collect the APK first. From the repository root, do not commit the APK.

```powershell
Get-FileHash -Algorithm SHA256 .\EatFitAI-android-v1.0.0.apk
gh release create android-v1.0.0 .\EatFitAI-android-v1.0.0.apk --title "EatFitAI Android v1.0.0" --notes "Public Android APK release."
```

If the release already exists:

```powershell
gh release upload android-v1.0.0 .\EatFitAI-android-v1.0.0.apk --clobber
```

Then update `sha256` in `download-site/script.js` with the SHA-256 value.

## Deploy on Cloudflare Pages

Recommended Pages settings:

- Framework preset: `None`
- Root directory: `download-site`
- Build command: leave empty
- Build output directory: `/`
- Production branch: the branch you want Cloudflare Pages to track

The temporary domain will be a `*.pages.dev` subdomain. A custom domain can be added later without changing the page code.

## R2 migration later

If you move the APK to Cloudflare R2 later, only change `downloadUrl`, `fileSize`, and `sha256` in `download-site/script.js`. The UI can stay the same.
