# AshReXcue - Feature Documentation

<div align="center">

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Orbitron&weight=500&pause=1000&color=41F791&center=true&vCenter=true&width=935&height=70&lines=Complete+Technical+Documentation;Deep+Dive+Into+AshReXcue;Protection+Mechanisms+Explained)](https://git.io/typing-svg)

</div>

---

## 📑 Quick Navigation

> **[Core Logic](#core)**<br>
> **[WebUI Dashboard](#dashboard)**<br>
> **[Settings](#settings)**<br>
> **[Troubleshooting](#troubleshooting)**<br>


---

## <a id="core"></a>🔧 Core Protection Logic

AshReXcue isn't just a "bootloop fixer"—it's an intelligent supervisor that learns your device's behavior.

### 1. The Boot Flow

* **Initialization:** At `post-fs-data`, we snapshot your module list and increment a "Loop Counter".
* **Monitoring:** The service waits for `sys.boot_completed` and then aggressively monitors system stability.
* **Verification:** It checks critical processes (`system_server`, `surfaceflinger`) for a defined **Stability Time** (default 10s).
* **Success:** If stable, the Loop Counter resets, and the current module list is saved as the "Known Good" state.

### 2. Intelligent Differential Analysis (jq)

Instead of blindly disabling everything, AshReXcue uses `jq` to compare the current boot against the last successful one.

* **Smart Detection:** It detects **New**, **Updated**, or **Modified** modules.
* **Precision Strike:** If a bootloop is detected, it disables *only* the modules that changed since the last successful boot.
* **Full Lockdown:** If disabling specific modules doesn't fix the loop (or if no changes are found), it falls back to disabling *all* modules to guarantee recovery.

### 3. Protection Modes

Configured during installation (via Volume Keys):

| Mode | Name | Behavior |
| :--- | :--- | :--- |
| **DM** | **Standard** | Disables problematic modules and reboots **System**. Best for automatic recovery. |
| **DMR** | **Nuclear** | Disables problematic modules and reboots to **Recovery**. Best for manual inspection. |

---

## <a id="dashboard"></a>💻 WebUI Dashboard (v2.3)

Access your device's heartbeat through a secure, local-only web interface.

### 🎨 Interface

* **Theme:** "Dark Retro" aesthetic with syntax-highlighted logs.
* **Security:** Binds strictly to `127.0.0.1` with a random port and unique session token.
* **Auto-Kill:** Server auto-terminates after 5 minutes (max) or 2 minutes (idle) to save resources.

### 📊 Features

* **Live Log Viewer:** Watch the boot logic unfold in real-time. Includes color-coded status for Errors (Red), Warnings (Yellow), and Success (Green).
* **Session Browser:** Travel back in time. View logs from previous boot attempts (up to 100 sessions tracked).
    * ✅ **Clean:** A successful boot.
    * 🚫 **Bootloop:** A failed attempt that triggered the counter.
    * ⚠️ **Active:** The current running session.
* **Settings Manager:** Adjust timeout and thresholds on the fly without rebooting.

---

## <a id="settings"></a>⚙️ Configuration & Settings

You can adjust these values inside the WebUI > Settings tab.

### ⏱️ Boot Timeout

* **Default:** 60s
* **Function:** The maximum time allowed for the device to reach `sys.boot_completed`.
* **Dynamic Learning:** AshReXcue automatically increases this value if your device consistently takes longer to boot (Successful Boot Time + 15s).
* **Constraint:** You cannot decrease this value by more than 10s at a time. This prevents accidental "instant loops" where the timeout is shorter than the actual boot time.

### 🔄 Loop Threshold

* **Range:** 1-5 Boots
* **Function:** How many failed attempts are allowed before Protection kicks in.
* **Recommendation:** Keep this at **2 or 3**. Setting it to 1 is aggressive and only for testing.

### 🛡️ Stability Time

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
> RTC Status: If logs show `RTC Status: BACKWARD`, your device clock reset (likely due to battery pull). Timestamps in logs will be wrong, but protection still works.

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

**🛡️ AshReXcue v9.3**<br>
*Your friendly neighborhood root savior.*

> _Built by **AshBorn**_<br>
> *I speak fluent nonsense 😊*

</div>