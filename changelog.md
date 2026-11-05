# 🚀 AshReXcue v10.1 Update Changelog

### 🔰 Core Engine

* **Framework Watchdog:** Now tracks the core framework processes by PID instead of only SystemUI, and treats three framework restarts in one boot as a loop.
* **No Double-Counting:** A parent restart re-baselines its children, so one framework restart no longer counts as several crashes.
* **Property Read Guard:** If system properties can't be read three checks in a row, the watchdog turns itself off for that boot instead of forcing a reboot.
* **Extra Stability Scope:** Turning on Extra Stability now also watches servicemanager and vold for restarts.
* **Service.d Only:** Script monitoring now covers only service.d scripts; post-mount.d and post-fs-data.d scripts are no longer tracked or auto-disabled.
* **Settings Sanitizing:** Invalid or out-of-range values are reset to defaults at boot and when the WebUI opens.

### 📲 Installer

* **Binary Check:** Setup verifies the bundled jq and zip are present and runnable, aborting with a clear message instead of installing a broken module.
* **Saved Config Check:** A restored stability window outside the allowed range now falls back to the default with a notice.

### 🎨 WebUI

* **Stability Window:** Watch time is now limited to 45–90 seconds with a 60 second default, and the stepper refuses values outside that range.
* **Real Command Status:** The WebUI now receives each command's real exit code, so failed commands show as errors instead of silent successes.
* **Activity Log Export:** Saving the log to Downloads now handles quotes, newlines or `$`, which used to break the save.