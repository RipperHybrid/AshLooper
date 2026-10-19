# 🚀 AshReXcue v10.0 Update Changelog

### 🔰 Core Engine

* **Soft Reboot Detection:** Boot ID and kernel uptime are saved after each stable boot. If either matches on the next boot, the loop counter resets and protection is skipped, so soft reboots no longer trigger false lockdowns.
* **Reworked `post-fs-data` Flow:** `handle_boot_loop` now runs before the counter is incremented.
* **Logs & Settings:** Logs now include Boot ID, Kernel Uptime and the soft reboot check. and fixed default stability time from 454s to 45s.
* **Binary Layout:** `jq` moved to `bin/jq`. The installer temporarily ships `bin/zip` and removes it after setup.
* **Removed:** The `looperbug.log` stderr redirect.

### 🎛️ Input Handling

* **VSKL Removed:** The Action Menu now uses the shared `chooseport` from `utils.sh`, rewritten with a deadline-based `getevent` stream and optional touch detection.

### 📲 Installer

* **Optional Partition Backup (Step 5):** Backs up supported partitions to `/sdcard/Download` as a zip with `sha256sums.txt` and device info.

### 🖥️ WebUI Session

* **Session End on Close:** Closing or hiding the page stops the server. The heartbeat is every 10s and `monitor.sh` checks every 5s.
* **Notification:** Shows the real 5 min session limit.

### 🎨 WebUI (V2.7)

* **Header Refresh Button:** Reloads everything in one tap.
* **Kernel Boot ID:** Shown in Settings, with a popup for the Recorded and Current IDs and a copy button.
* **Activity Log:** Copy is replaced with Save to Downloads, and each entry has its own copy button.
* **Polish:** Animated checkboxes, quieter startup logging, and cleanup of unused icons and CSS.

### 📦 Release & Distribution

* **GitLab Releases:** Releases are now published to GitLab, with a preflight check.
* **Telegram Buttons:** Separate GitHub and GitLab buttons.