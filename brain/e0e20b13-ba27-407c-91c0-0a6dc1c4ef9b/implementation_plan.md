# Reinstall Open Design (nexu-io/open-design) Plan

This plan outlines the steps to completely uninstall previous installations and install the official Open Design app (from nexu-io/open-design repo, version v0.8.0).

## User Review Required

> [!IMPORTANT]
> The Windows installer for `nexu-io/open-design` is **unsigned**. When launched, Windows SmartScreen will display a warning. You will need to click **"More info"** and **"Run anyway"** to allow the installer to run.

## Proposed Changes

We will clean up the old installation files (`D:\OpenCoDesign`, `.env`, `launch-codesign.bat`), download the official Windows installer of Open Design v0.8.0, run the installation, and set up a new launch script.

### Clean up and Reinstall

#### [DELETE] [launch-codesign.bat](file:///d:/launch-codesign.bat)
#### [NEW] [launch-codesign.bat](file:///d:/launch-codesign.bat)

## Verification Plan

### Manual Verification
- Verify no running processes for Open CoDesign or Open Design.
- Download the installer, prompt the user for execution, and verify the app installs successfully.
- Verify `localhost:3000` loads properly with the new Open Design app.
