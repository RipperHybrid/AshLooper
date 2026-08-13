# AshReXcue - Feature Documentation

<div align="center">

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Orbitron&weight=500&pause=1000&color=41F791&center=true&vCenter=true&width=935&height=70&lines=Complete+Technical+Documentation;Deep+Dive+Into+AshReXcue;Protection+Mechanisms+Explained)](https://git.io/typing-svg)

</div>

---

## 📑 Quick Navigation

> **[Core Logic & Lockdown Stages](#core)**<br>
> **[Boot Script Protection](#scripts)**<br>
> **[Action Menu & VSKL](#action-menu)**<br>
> **[WebUI Dashboard](#dashboard)**<br>
> **[Items Control Center](#items)**<br>
> **[Settings & Whitelist](#settings)**<br>
> **[Troubleshooting](#troubleshooting)**<br>

---

<a id="core"></a>
## 🔧 Core Protection Logic & Lockdown Stages

AshReXcue isn't just a "bootloop fixer" it's an intelligent supervisor with a tiered escalation system.

### 1. The Boot Flow

* **Initialization:** At `post-fs-data`, AshReXcue snapshots your module list (and boot scripts, if enabled), increments a "Loop Counter", and sets a strict `booting` state lock.
* **Live Status Description:** The module's description in your root manager swaps live to `⏳ Booting... Monitoring stability, pull to refresh for status.` for the duration of the boot sequence. The original description is safely stashed (`orig_description`) and restored automatically once `service.sh` finishes.
* **Monitoring:** The decoupled `monitor.sh` tracking payload initializes while the main service waits for `sys.boot_completed`.
* **SystemUI Guard:** The script aggressively tracks **SystemUI** (`com.android.systemui`) for your defined **Stability Time**. If SystemUI crashes and restarts 3 times during this stability window, AshReXcue instantly flags the boot as a failure and triggers crash-reboot protection to break the loop.
* **Success:** If stable, the Loop Counter resets, the `booted` state unlocks, the active module/script list is saved as the "Known Good" state, the original description is restored, and orphaned entries are scrubbed from the Whitelist.

### 2. The Three Stages of Lockdown

If the Loop Counter hits your configured threshold, AshReXcue escalates through three distinct phases to save your device.

* **Stage 1: Precision Strike (`disable_mode=none`)**
  AshReXcue uses `jq` to compare the current boot against the last successful one, hashing boot scripts. It disables *only* the new or modified items (ignoring any that are whitelisted). If it can't find any changes, it immediately escalates to Stage 2.
* **Stage 2: Standard Lockdown (`disable_mode=partial`)**
  If Stage 1 failed to stop the bootloop, AshReXcue takes broader action. It disables **ALL** modules and monitored boot scripts on your device, *except* those explicitly protected by your Whitelist.
* **Stage 3: Full Nuclear Lockdown (`disable_mode=full`)**
  If your device *still* bootloops after Stage 2, AshReXcue drops the hammer. It completely ignores the Whitelist and disables **EVERYTHING** including itself (`AshLooper`), to guarantee you can boot into your OS.

### 3. Reboot Modes

Configured during installation or via the WebUI:

| Mode | Name | Behavior |
| :--- | :--- | :--- |
| **DM** | **Standard** | Disables problematic modules/scripts and reboots **System**. Best for automatic recovery. |
| **DMR** | **Nuclear** | Disables problematic modules/scripts and reboots to **Recovery**. Best for manual inspection. |

---

<a id="scripts"></a>
## 📜 Boot Script Protection

New in v9.9, AshReXcue extends its differential engine beyond root modules to cover early and late boot scripts.

* **Monitored Directories:** `service.d`, `post-mount.d`, and `post-fs-data.d`.
* **Toggle:** Controlled by the **Boot Scripts (.d)** switch in Settings (`monitor_scripts`). Disabled by default on fresh installs unless enabled during setup.
* **Isolation, Not Deletion:** When a script is disabled by protection logic, it is moved into an internal vault at `/data/adb/ashlooper/` and the original path is replaced with a `chmod 000` dummy file — blocking execution without losing the file. Its original permission bits are preserved in the filename for exact restoration later.
* **Identification Format:** Scripts are tracked and whitelisted using a `prefix:filename` scheme — `svc:` for `service.d`, `pmd:` for `post-mount.d`, and `pfd:` for `post-fs-data.d`.
* **Recovery:** Isolated scripts can be restored from the **Items** tab in the WebUI, or via the **Restore Disabled Items** option in the Action Menu.

---

<a id="action-menu"></a>
## ⚙️ Action Menu & VSKL Input

AshReXcue features a built-in interactive CLI menu accessible via your root manager's "Action" button.

* **VSKL (Volume/Screen Key Listener):** Navigate the Action Menu using either your physical **Volume Keys** or direct **Screen Touches**.
* **Anti-Stall:** The input listener features a max-retry limit to prevent infinite hangs during boot or terminal execution if hardware keys aren't detected.
* **Pre-emptive Port Verification:** Before launching the WebUI, `action.sh` actively checks `/proc/net/tcp` to ensure the dynamically generated localhost port isn't occupied by another system process, preventing launch failures.
* **Menu Options:**
    1. **Open WebUI** — launches the localhost dashboard.
    2. **Add to Whitelist** — covers both modules and (if enabled) boot scripts.
    3. **Remove from Whitelist**
    4. **Restore Disabled Items** — recover any disabled module or isolated boot script directly from the command line, no WebUI required.
    5. **Exit**

---

<a id="dashboard"></a>
## 💻 WebUI Dashboard (V2.6)

Access your device's heartbeat through a secure, local-only web interface.

### 🎨 Interface & Navigation

* **Claymorphic Redesign:** A complete visual rewrite featuring deep neumorphic/clay shadows, a compact app header, and a floating pill-style bottom navigation bar with 4 tabs: **Logs**, **Whitelist**, **Items**, and **Settings**.
* **App Header Popups:** Tapping the header opens the **Module Info** popup (name, version, author, module ID). Two dedicated header buttons open the **JSON Viewer** and the **Guide & Glossary**.
* **Touch Optimized:** Inputs automatically blur during scroll/touch events to prevent the keyboard from blocking the screen; tap-highlight and text-selection are suppressed app-wide for a native feel.

### 🔒 Security & State Locks

* **Active Scanning Lockout:** Enforces a strict handshake with `service.sh`. If you attempt to modify Settings, Whitelist, or Items while the system is still `booting` (actively scanning for loops), the WebUI blocks the edits with a hard warning to prevent fatal race conditions and configuration corruption. A force-edit override is available if you understand the risk.
* **Localhost Only:** Binds strictly to `127.0.0.1` with a randomized port.
* **Zero-Escape Execution:** CGI scripts pipe directly to `stdin`, bypassing quote-escaping vulnerabilities entirely.
* **Hash-Based Auth:** Session tokens are passed securely via URL hash fragments (`#TOKEN`) and instantly wiped from browser history.

### 📊 Dashboard Features

* **Global Changes Pill:** A single floating pill above the nav bar now tracks **all** unsaved modifications across Settings, Whitelist, and Items simultaneously. It changes color contextually—yellow for additions/enables, red for removals/disables, orange when a batch mixes both—and lets you save or discard everything at once.
* **Live Log Viewer:** Watch the boot logic unfold in real-time. Includes a sticky color-coded legend for Normal, Warnings (Purple), and Errors (Red), plus highlighting for nuke/crash events.
* **Session Browser:** Travel back in time. View logs from previous boot attempts.
    * ✅ **Clean:** A successful boot.
    * 🚫 **Bootloop:** A failed attempt that triggered the counter.
    * ⚠️ **Active:** The current running session.
* **Activity Log:** A built-in diagnostics panel (Settings → Debug & Diagnostics) that records every shell command the WebUI executes in the background, along with a human-readable summary of the outcome. Copy or clear the log at any time.
* **JSON Viewer:** A native, syntax-plain viewer for inspecting the raw `module.json` differential state directly from the app header, with a one-tap copy button.
* **Whitelist Manager:** A unified tab covering both modules and boot scripts, with tabbed filtering between **Whitelisted** and **Normal** items.
* **Settings Manager:** Adjust timeouts, thresholds, and toggles on the fly. Includes a long-press step-size selector for precise timing tuning on both Stability Time and Threshold.

---

<a id="items"></a>
## 🗂️ Items Control Center

A dedicated **Items** tab gives you direct, granular control over everything AshReXcue is tracking.

* **Modules Tab:** View every installed root module with live enabled/disabled status. Pause, resume, or mark a module for removal (deleted safely on next reboot, restorable until then). `AshLooper` itself is always shown locked and protected.
* **Scripts Tab:** View every tracked `service.d` / `post-mount.d` / `post-fs-data.d` script (only visible when **Boot Scripts (.d)** monitoring is enabled). Pause, resume, or permanently delete a script—deletion also kills any currently running process tied to that script.
* **Search:** Filter both modules and scripts by name or ID directly from the search bar.
* **Confirmation Modals:** Destructive actions (removal/deletion) require an explicit confirmation step to prevent accidental data loss.
* **Busy States:** Items mid-operation are visually locked to prevent double-actions while a shell command is in flight.

---

<a id="settings"></a>
## ⚙️ Configuration & Settings

You can adjust these values inside the WebUI > Settings tab.

### 🛡️ Whitelist (Modules + Scripts)

* **Function:** Protects selected modules and boot scripts from being disabled during a Stage 2 Standard Lockdown. (Note: A Stage 3 Full Lockdown overrides this).
* **Auto-Maintenance:** The service automatically cleans the whitelist array on every successful boot, removing entries for modules you have uninstalled.
* **Smart Migration:** If you upgrade to a newer AshReXcue version, the installer automatically detects and restores your old whitelist and stability time.

### 📜 Boot Scripts (.d)

* **Toggle:** Enable/Disable (`monitor_scripts`)
* **Function:** When enabled, AshReXcue extends full differential tracking, whitelisting, and lockdown protection to `service.d`, `post-mount.d`, and `post-fs-data.d`.
* **Note:** Leave this off if you don't run custom boot scripts, to keep boot-time scanning minimal.

### ⏱️ Boot Timeout

* **Default:** 60s
* **Function:** The maximum time allowed for the device to reach `sys.boot_completed`.
* **Dynamic Learning:** AshReXcue automatically increases this value if your device consistently takes longer to boot (Successful Boot Time + 15s).
* **Constraint:** You cannot decrease this value by more than 10s at a time. This prevents accidental "instant loops" where the timeout is shorter than the actual boot time.

### 🔄 Loop Threshold

* **Range:** 1-4 Boots
* **Function:** How many failed attempts are allowed before Protection kicks in.
* **Recommendation:** Keep this at **2 or 3**. Setting it to 1 is aggressive and only for testing.

### ⏳ Stability Time

* **Range:** 35s - 120s
* **Function:** How long to monitor the system *after* boot completes. If `com.android.systemui` crash-loops (3 restarts) during this window, it triggers protection.

### 🔬 Extra Stability Checks

* **Toggle:** Enable/Disable
* **Function:** Adds additional daemon monitoring for `servicemanager` and `vold`.
* **Warning:** Only enable this if you are debugging deep system crashes. On some minimal ROMs, these services might behave unexpectedly.

---

<a id="troubleshooting"></a>
## ⚠️ Troubleshooting & Warnings

### 🔴 Critical Warnings

> [!WARNING]
> DO NOT modify `settings.prop` manually unless you know exactly what you are doing. A bad syntax error here can break the protection logic. Use the WebUI whenever possible.

> [!CAUTION]
> DO NOT use AshReXcue alongside other bootloop saver modules (e.g., Magisk Bootloop Protector). They will conflict, fight for control, and likely cause a permanent bootloop.

> [!TIP]
> RTC Status: If logs show `RTC Status: BACKWARD`, your device clock reset (likely due to a battery pull). Timestamps in logs will be wrong, but protection still works.

### 🐛 Reporting Issues

If AshReXcue fails to protect your device or triggers falsely, please report it on GitHub with logs.

1.  **Retrieve Logs:**
    * **Recovery:** `cat /cache/looper/AshReXcueSession-*.log`
    * **ADB:** `adb shell cat /cache/looper/AshReXcueSession-*.log`
    * **WebUI:** Click the "Save" icon to export to Downloads.
    * **WebUI (Command-level):** Open Settings → Activity Log for a full trace of executed shell commands.

2.  **Submit Issue:**
    * Go to: [GitHub Issues](https://github.com/RipperHybrid/AshLooper/issues)
    * Include your **Root Method** (Magisk/KSU/APatch) and **Device Model**.
    * Attach the log file (and Activity Log export, if relevant).

### 🚑 Emergency Uninstall

If you are stuck and need to remove AshReXcue from Recovery:

1.  Open Terminal/ADB in Recovery.
2.  Run: `rm -rf /data/adb/modules/AshLooper`
3.  Reboot.

*Note: `uninstall.sh` also cleans up `/cache/looper` and `/data/adb/ashlooper` (which holds any isolated modules/scripts) — restore anything you need beforehand via the Action Menu's Restore option.*

---

<div align="center">

*Your friendly neighborhood root savior.*

> _Built by **AshBorn**_<br>
> *I speak fluent nonsense 😊*

</div>