# Walkthrough: Open Design Reinstallation

We have successfully uninstalled the old Open CoDesign app and installed the official Open Design app (v0.8.0) by `nexu-io/open-design`.

## Changes Made

1. **Stopped Port 3000 Process:** Identified and stopped the Node process on port 3000.
2. **Uninstalled Old App:** Ran the uninstaller for Open CoDesign located at `D:\OpenCoDesign\Uninstall Open CoDesign.exe`.
3. **Cleaned Cache and Local Folders:** Removed left-over app data from `AppData` and `D:\OpenCoDesign`.
4. **Downloaded Installer:** Downloaded the official `open-design-0.8.0-win-x64-setup.exe` from GitHub Releases.
5. **Silent Install:** Installed Open Design silently under `C:\Users\PC\AppData\Local\Programs\Open Design`.
6. **Created Launch Script:** Re-created `D:\launch-codesign.bat` pointing to the new `Open Design.exe`.

## Verification

- The new app folder `C:\Users\PC\AppData\Local\Programs\Open Design` was verified to exist.
- The `D:\launch-codesign.bat` script was created with the correct path and configuration.
- We have asked the user to manually trigger the launch script to run the application in their GUI session.
