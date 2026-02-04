# 🚀 AshReXcue v9.4 Update

### ✨ WebUI V2.3 & Settings Overhaul
* **Tabbed Interface:** New navigation system separating **Logs** and **Settings** for a cleaner experience.
* **Live Configuration:** Modify protection parameters (`timeout`, `threshold`, `stability_time`) directly from the browser with real-time input validation.
* **Auto-Repair System:** The WebUI now detects corruption in `settings.prop` and automatically repairs the file structure to prevent crashes.
* **Toast Notifications:** Added visual feedback for saving logs, updating settings, and system status.

### ⚙️ Core Logic Refactor (`utlis.sh`)
* **Ghost Module Detection:** Rewrote `create_mod_list` to scan **all** folders in `/data/adb/modules/`. The script now detects and can disable "broken" modules that are missing their `module.prop` file.
* **Sanitized Parsing:** Replaced complex `awk` logic with a standardized, robust `get_prop` function. This fixes parsing errors caused by line endings and special characters.
* **Default Fallbacks:** Implemented strict default values (ID defaults to folder name) to ensure the JSON module list is always valid.

### 🔒 Security & CGI
* **Smart Root Escalation:** The `exec` script now runs in standard user mode by default and only escalates to Root (`su -c`) when modifying protected files (like `settings.prop`).
* **Enhanced Sandbox:** Stricter path validation prevents the WebUI from accessing unauthorized system partitions.

### 📦 Installer & Logging
* **Persistent Selection:** The installer (`customize.sh`) now loops indefinitely until a valid Volume Key selection is made, preventing accidental "default" installations.
* **Root Info:** Now displays the detected Root method and version during installation.
* **Debug Tracing:** Added error redirection to `/cache/looper/looperbug.log` in `post-fs-data.sh` and `service.sh` to catch startup failures.