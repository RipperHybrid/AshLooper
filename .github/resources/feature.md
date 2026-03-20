# AshReXcue - Feature Documentation

<div align="center">

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Orbitron&weight=500&pause=1000&color=41F791&center=true&vCenter=true&width=935&height=70&lines=Complete+Technical+Documentation;Deep+Dive+Into+AshReXcue;Protection+Mechanisms+Explained)](https://git.io/typing-svg)

</div>

---

## 📑 Quick Navigation

> **[Core Logic & Lockdown Stages](#core)**<br>
> **[Action Menu & VSKL](#action-menu)**<br>
> **[WebUI Dashboard](#dashboard)**<br>
> **[Settings & Whitelist](#settings)**<br>
> **[Troubleshooting](#troubleshooting)**<br>

---

## <a id="core"></a>🔧 Core Protection Logic & Lockdown Stages

AshReXcue isn't just a "bootloop fixer"—it's an intelligent supervisor with a tiered escalation system.

### 1. The Boot Flow

* **Initialization:** At `post-fs-data`, we snapshot your module list and increment a "Loop Counter".
* **Monitoring:** The service waits for `sys.boot_completed` and then aggressively monitors system stability.
* **Verification:** It checks critical processes (`system_server`, `surfaceflinger`) for a defined **Stability Time** (default 10s).
* **Success:** If stable, the Loop Counter resets, the active module list is saved as the "Known Good" state, and orphaned modules are scrubbed from the Whitelist.

### 2. The Three Stages of Lockdown

If the Loop Counter hits your configured threshold, AshReXcue escalates through three distinct phases to save your device.

* **Stage 1: Precision Strike (`disable_mode=none`)**
  AshReXcue uses `jq` to compare the current boot against the last successful one. It disables *only* the new or modified modules (ignoring any that are whitelisted). If it can't find any changes, it immediately escalates to Stage 2.
* **Stage 2: Standard Lockdown (`disable_mode=partial`)**
  If Stage 1 failed to stop the bootloop, AshReXcue takes broader action. It disables **ALL** modules on your device, *except* those explicitly protected by your Whitelist.
* **Stage 3: Full Nuclear Lockdown (`disable_mode=full`)**
  If your device *still* bootloops after Stage 2, AshReXcue drops the hammer. It completely ignores the Whitelist and disables **EVERYTHING**, including itself (`AshLooper`), to guarantee you can boot into your OS.

### 3. Reboot Modes

Configured during installation or via the WebUI:

| Mode | Name | Behavior |
| :--- | :--- | :--- |
| **DM** | **Standard** | Disables problematic modules and reboots **System**. Best for automatic recovery. |
| **DMR** | **Nuclear** | Disables problematic modules and reboots to **Recovery**. Best for manual inspection. |

---

## <a id="action-menu"></a>⚙️ Action Menu & VSKL Input

AshReXcue features a built-in interactive CLI menu accessible via your root manager's "Action" button.

* **VSKL (Volume/Screen Key Listener):** Navigate the Action Menu using either your physical **Volume Keys** or direct **Screen Touches**.
* **Anti-Stall:** The input listener features a max-retry limit to prevent infinite hangs during boot or terminal execution if hardware keys aren't detected.
* **Menu Options:** Quickly launch the WebUI on localhost, manually add/remove modules from the Whitelist, or safely exit the session.

---

## <a id="dashboard"></a>💻 WebUI Dashboard (V2.4)

Access your device's heartbeat through a secure, local-only web interface.

### 🎨 Interface & Navigation

* **Theme:** "Dark Retro" aesthetic with a sleek, Floating Action Button (FAB) navigation menu.
* **Touch Optimized:** Inputs automatically blur during scroll/touch events to prevent the keyboard from blocking the screen.

### 🔐 Security

* **Localhost Only:** Binds strictly to `127.0.0.1` with a randomized port.
* **Zero-Escape Execution:** CGI scripts pipe directly to `stdin`, bypassing quote-escaping vulnerabilities entirely.
* **Hash-Based Auth:** Session tokens are passed securely via URL hash fragments (`#TOKEN`) and instantly wiped from browser history.
* **Auto-Kill:** The server auto-terminates after 5 minutes (max) or 2 minutes (idle) to save system resources.

### 📊 Dashboard Features

* **Live Log Viewer:** Watch the boot logic unfold in real-time. Includes color-coded status for Errors (Red), Warnings (Yellow), and Success (Green).
* **Session Browser:** Travel back in time. View logs from previous boot attempts (up to 100 sessions tracked).
    * ✅ **Clean:** A successful boot.
    * 🚫 **Bootloop:** A failed attempt that triggered the counter.
    * ⚠️ **Active:** The current running session.
* **Whitelist Manager:** A dedicated tab with swipe gestures to easily toggle modules between your "Normal" pool and your protected "Whitelist".
* **Settings Manager:** Adjust timeouts and thresholds on the fly. Features a sticky footer action bar to track, save, or discard unsaved changes without rebooting.

---

## <a id="settings"></a>⚙️ Configuration & Settings

You can adjust these values inside the WebUI > Settings tab.

### 🛡️ Module Whitelist

* **Function:** Protects selected modules from being disabled during a Stage 2 Standard Lockdown. (Note: A Stage 3 Full Lockdown overrides this).
* **Auto-Maintenance:** The service automatically cleans the whitelist array on every successful boot, removing entries for modules you have uninstalled.
* **Persistence:** Your whitelist array survives module updates and reflashes.

### ⏱️ Boot Timeout

* **Default:** 60s
* **Function:** The maximum time allowed for the device to reach `sys.boot_completed`.
* **Dynamic Learning:** AshReXcue automatically increases this value if your device consistently takes longer to boot (Successful Boot Time + 15s).
* **Constraint:** You cannot decrease this value by more than 10s at a time. This prevents accidental "instant loops" where the timeout is shorter than the actual boot time.

### 🔄 Loop Threshold

* **Range:** 1-5 Boots
* **Function:** How many failed attempts are allowed before Protection kicks in.
* **Recommendation:** Keep this at **2 or 3**. Setting it to 1 is aggressive and only for testing.

### ⏳ Stability Time

* **Range:** 10s - 25s
* **Function:** How long to monitor the system *after* boot completes. If `system_server` crashes during this window, it counts as a loop.

### 🔬 Extra Stability Checks

* **Toggle:** Enable/Disable
* **Function:** Adds monitoring for `servicemanager`, `vold`, and `logd`.
* **Warning:** Only enable this if you are debugging deep system crashes. On some minimal ROMs, these services might behave unexpectedly.

---

## <a id="troubleshooting"></a>⚠️ Troubleshooting & Warnings

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

2.  **Submit Issue:**
    * Go to: [GitHub Issues](https://github.com/RipperHybrid/AshLooper/issues)
    * Include your **Root Method** (Magisk/KSU/APatch) and **Device Model**.
    * Attach the log file.

### 🚑 Emergency Uninstall

If you are stuck and need to remove AshReXcue from Recovery:

1.  Open Terminal/ADB in Recovery.
2.  Run: `rm -rf /data/adb/modules/AshLooper`
3.  Reboot.

---

<div align="center">

**🛡️ AshReXcue v9.5**<br>
*Your friendly neighborhood root savior.*

> _Built by **AshBorn**_<br>
> *I speak fluent nonsense 😊*

</div>