### 📝 Changelog / Release Notes

# 🚀 AshReXcue v9.7 Update

### 🛠️ Core Engine Removals & Streamlining

* **Stripped Legacy Tracking:** Removed `system_server` and `surfaceflinger` process checks from `service.sh` and the installer calibration. The engine is now significantly lighter and relies purely on `com.android.systemui` status, reducing false positives on heavy OEM ROMs.
* **Lowered Crash Threshold:** With the tracking streamlined, the critical failure threshold for SystemUI crashes has been tightened from 5 consecutive failures down to 3 for faster bootloop intervention.
* **Static Monitor Payload:** Ripped out the complex dynamic script generation inside `action.sh`. The localhost timeout and lifecycle manager now runs through a clean, dedicated `monitor.sh` file.

### 🛡️ State Locks & Safety

* **Active Scanning Lockout:** `post-fs-data.sh` now sets a `booting` flag that isn't cleared to `booted` until `service.sh` fully finishes its stability checks. The WebUI reads this flag and actively blocks you from editing settings while the daemon is scanning, preventing fatal race conditions.
* **Smart Config Migration:** Upgrading to the new architecture requires a clean install, but `customize.sh` now scans your old module directory first and will automatically restore your custom Whitelist and Stability configurations.
* **Pre-emptive Port Verification:** `action.sh` now checks `/proc/net/tcp` and `/proc/net/tcp6` before launching the WebUI server, ensuring the randomly generated port isn't already occupied by another Android system process.

### 🎨 WebUI Overhaul (V2.6)

* **Glassmorphism Redesign:** Nuked the old CSS. The WebUI now features a dark, heavily blurred, glassmorphism aesthetic with a floating dynamic status island and an animated "Changes Pill" that tracks unsaved edits.
* **Native Base64 Rendering:** Dropped external image dependencies for the banner. The UI now directly executes a root shell command to decode and inject your local `banner` payload straight into the DOM.