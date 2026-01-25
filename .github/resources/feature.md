# AshReXcue - Complete Feature Documentation

<div align="center">
  
[![Typing SVG](https://readme-typing-svg.demolab.com?font=Orbitron&weight=500&pause=1000&color=41F791&center=true&vCenter=true&width=935&height=70&lines=Complete+Technical+Documentation;Deep+Dive+Into+AshReXcue;Protection+Mechanisms+Explained)](https://git.io/typing-svg)

</div>

---

## 📑 Table of Contents

- [How It Works](#-how-it-works)
- [Intelligent Protection](#-intelligent-protection)
- [WebUI Dashboard](#-webui-dashboard)
- [Security Architecture](#-security-architecture)
- [Configuration & Settings](#-configuration--settings)
- [Protection Modes](#-protection-modes)
- [Logs & Debugging](#-logs--debugging)
- [Advanced Features](#-advanced-features)
- [Troubleshooting](#-troubleshooting)

---

## 🔧 How It Works

AshReXcue implements a multi-stage protection system that monitors your device throughout the boot process:

### Boot Protection Workflow

1. **Boot Start (post-fs-data.sh)**
   - AshReXcue initializes early in the boot sequence
   - Loads current module configuration from settings.prop
   - Creates JSON snapshot of all installed modules using jq
   - Begins monitoring boot progress
   - Logs session start with boot number, date, and RTC status

2. **Active Monitoring Phase (service.sh)**
   - Validates process monitoring tools (pgrep/pidof)
   - Waits for boot completion within defined `timeout` (default: 60s)
   - Tracks boot time to dynamically adjust future timeout values
   - Monitors for `sys.boot_completed` property
   - Prevents parallel execution using lock directory in /dev

3. **Stability Verification**
   - Once booted, monitors critical system processes:
     - `system_server` - Core Android system service
     - `surfaceflinger` - Display rendering service
     - Optional: `servicemanager`, `vold`, `logd` (if Extra Stability enabled)
   - Continues monitoring for `stability_time` (default: 10s, range: 10-25s)
   - Uses consecutive failure threshold (5 failures) before triggering protection
   - Ensures device is actually usable, not just technically "booted"

4. **Success Checkpoint**
   - If stability check passes, performs jq-based module comparison
   - Saves current module list as "Known Good" state in JSON format
   - Logs all module changes (Added, Updated, Removed, Status changed)
   - Updates timeout based on actual boot time (+ 15s buffer)
   - Resets loop counter to 0
   - Cleans up any stale WebUI server processes

5. **Failure Response**
   
   **A. Threshold Not Reached:**
   - Increments bootloop counter in settings.prop
   - Logs the failed attempt with debug information
   - Allows device to retry on next boot
   
   **B. Threshold Reached (Protection Activated):**
   
   - **Step 1: Smart Detection (disable_mode = "none")**
     - Uses jq to compare current modules against last successful boot
     - Identifies newly installed, updated, or status-changed modules
     - Generates differential list of problematic modules
     - Calculates changes in name, version, versionCode, status, and size
   
   - **Step 2: Targeted Strike (disable_mode = "partial")**
     - Disables *only* the suspicious (new/changed) modules
     - Creates `disable` file in each problematic module's directory
     - Preserves known-good modules
     - Minimizes disruption to working configuration
     - Reboots normally or to recovery based on mode setting
   
   - **Step 3: Emergency Lockdown (disable_mode = "full")**
     - Triggered if partial disable fails to resolve bootloop
     - Disables *all* modules except AshReXcue itself
     - Creates comprehensive log of all disabled modules
     - Guarantees device recovery as last resort
     - Optional: Disables AshReXcue too if explicitly requested

---

## 🛡️ Intelligent Protection

### Smart Differential Analysis with jq

AshReXcue uses the powerful jq JSON processor for precise module comparison:

**Change Detection Examples:**
- ✅ New module installed → Detected and logged
- ✅ Module updated (version/versionCode changed) → Detected
- ✅ Module enabled after being disabled → Detected
- ✅ Module size changed (reinstallation) → Detected
- ✅ Module removed → Logged (but doesn't trigger disable)
- ❌ Existing unmodified modules → Not touched

### Dynamic Timeout System

AshReXcue learns from your device's actual boot performance:

- **Initial Timeout:** 60 seconds (conservative default)
- **Learning Phase:** Records actual boot times over multiple successful boots
- **Adjustment:** Automatically increases timeout based on successful boot time + 15s
- **Safety Constraint:** Cannot decrease by more than 10s per change (prevents accidental loops)
- **User Override:** Can be manually adjusted in WebUI (with validation)

**Example:**
```
Boot 1: 45s → Timeout updates to 60s (45+15)
Boot 2: 48s → Timeout updates to 63s (48+15)
Boot 3: 52s → Timeout updates to 67s (52+15)
Boot 4: 35s → Timeout updates to 50s (35+15)
User tries to set 20s → Blocked (< 40s minimum from current 50s)
```

### Advanced Stability Monitoring

The system doesn't just check if `sys.boot_completed` is set. It actively validates:

**System Server Health:**
- Checks if `system_server` process is running
- Verifies process isn't in zombie/defunct state
- Monitors for repeated crashes
- Uses consecutive failure threshold

**Display Service Health:**
- Verifies `surfaceflinger` is active
- Ensures UI rendering is functional
- Detects black screen scenarios

**Optional Advanced Checks:**
- `servicemanager` - Service registry
- `vold` - Volume daemon
- `logd` - Logging daemon

**Monitoring Logic:**
```
Check Interval: 3 seconds
Failure Threshold: 5 consecutive failures
Log Interval: 5 seconds (progress updates)
```

---

### Dashboard Features

#### 🔍 Live Log Viewer
- **Real-time Display:** Syntax-highlighted terminal output
- **Color Coding:**
  - 🔴 ERROR (red) - Critical failures
  - 🟡 WARNING (yellow) - Potential issues
  - 🟢 SUCCESS (green) - Successful operations
  - 🔵 INFO (blue) - Informational messages
  - 🟢 RTC CORRECT (green) - System time verified
  - 🔴 RTC INCORRECT (red) - System time drift detected
- **Smart Formatting:**
  - Boot headers with session numbers
  - Boot footers for completed sessions
  - Automatic scrolling to latest entry
- **Search Functionality:**
  - Real-time log filtering
  - Case-insensitive search
  - Highlights matching entries

#### 📊 Session History Browser

**Session Status Indicators:**
- ✅ **Clean Boot** - Session ended with "THE END" marker
- ⚠️ **Active Session** - Last session without end marker (current boot)
- 🚫 **Bootloop** - Incomplete session (not last) without end marker

**Session Metadata:**
- Boot number (parsed from log headers)
- Date and time (extracted from log content)
- RTC status (CORRECT/BACKWARD/INCORRECT)
- Line count
- Session type badge

**View Options:**
- **All Log Data** - Complete file view (all sessions)
- **Individual Sessions** - Isolated boot session view

#### ⚙️ Settings Management

**Real-time Configuration with Validation:**

| Setting | Default | Range | Validation |
|---------|---------|-------|------------|
| **Boot Timeout** | 60s | (current-10) - 300s | Cannot decrease > 10s per change |
| **Loop Threshold** | User Set | 1 - 5 | Must be 1-5 integer |
| **Stability Time** | 10s | 10s - 25s | Must be 10-25 integer |
| **Extra Stability** | false | toggle | Boolean switch |

**Safety Mechanisms:**
- **Input Validation:** Real-time range checking
- **Timeout Protection:** Prevents dangerous timeout reductions
- **Change Warning:** Modal dialog for risky timeout changes
- **Save Confirmation:** Only allows valid configurations
- **Atomic Updates:** Uses sed for in-place file modification

#### 📁 File Management

**Export Capabilities:**

1. **Copy to Clipboard**
   - Uses Clipboard API (primary)
   - Fallback: execCommand('copy')
   - Works for full logs or individual sessions

2. **Save to Downloads**

3. **File Naming:**
   - Full logs: Original filename preserved
   - Sessions: `AshReXcue-Boot{N}-{timestamp}.log`

---

## 🔒 Security Architecture

### WebUI Security Model

**Multi-Layer Protection:**

1. **Network Isolation**
   - Binds to 127.0.0.1 (localhost only)
   - No external network access possible
   - Prevents remote attacks entirely

2. **Port Randomization**

3. **Token Authentication**

4. **Session Management**

5. **Command Whitelist (CGI Executor)**

**Automatic Shutdown Triggers:**
- 5 minute absolute maximum (DEADLINE reached)
- 2 minute idle timeout (no activity)
- Manual server stop
- Device reboot
- Server crash/error

---

## ⚙️ Configuration & Settings

### Installation Options

During zip installation via **customize.sh**, you configure using **Volume Keys**:

**Step 1: Protection Mode**
- **Volume Up (Select)** or **Volume Down (Next)** to cycle:
  1. **Standard (DM)** - Disable Modules Only
     - Disables problematic modules
     - Reboots normally
     - Fastest recovery
  
  2. **Nuclear (DMR)** - Disable + Recovery
     - Disables problematic modules
     - Reboots into Recovery Mode
     - Allows manual intervention

**Step 2: Trigger Threshold**
- **Volume Up** to cycle through: 1, 2, 3, 4 boots
- **Volume Down** to confirm selection

**Recommended Thresholds:**
- **1 boot** - Aggressive (instant protection, testing only)
- **2 boots** - Balanced (recommended for most users)
- **3 boots** - Conservative (stable setups)
- **4 boots** - Very patient (multiple retry chances)

**Step 3: Calibration (Automatic)**
- Checks for `system_server` process
- Checks for `surfaceflinger` process
- Configures check_ss and check_sf flags

**Step 4: Advanced Monitor**
- Only shown if both system_server and surfaceflinger detected
- **Volume Up** - Enable extra stability checks
- **Volume Down** - Disable extra stability checks

### Runtime Settings (WebUI)

Adjustable after installation through the dashboard settings modal:

#### Boot Timeout
- **Current Value:** Displayed in settings
- **Range:** (current - 10) to 300 seconds
- **Purpose:** Maximum time to wait for boot completion
- **Constraint:** Cannot decrease by more than 10s at once
- **Auto-Update:** Increases based on successful boot time + 15s buffer

**When to Adjust:**
- Increase if device consistently takes longer to boot
- Decrease for very fast devices (with caution)
- Monitor actual boot times in session logs

#### Loop Threshold
- **Current Value:** User-configured during install
- **Range:** 1 - 5 boots
- **Purpose:** Number of failed boots before protection activates
- **Modification:** Editable via WebUI

**Considerations:**
- Lower = Faster protection, less tolerance for transient issues
- Higher = More patient, slower recovery from persistent problems

#### Stability Time
- **Default:** 10 seconds
- **Range:** 10s - 25s
- **Purpose:** Post-boot monitoring duration
- **Recommendation:** Keep at default unless issues occur

**When to Adjust:**
- Increase if apps crash 10-20s after boot
- Increase if UI becomes responsive after 10s
- Decrease for minimal systems with fast stabilization

#### Extra Stability Checks
- **Type:** Boolean toggle
- **Default:** User-configured during install
- **Monitors:** servicemanager, vold, logd (in addition to system_server, surfaceflinger)

**Enable If:**
- Experiencing delayed crashes
- System feels unstable despite passing basic checks
- Running many background services

**Disable If:**
- Minimal ROM/system
- Services legitimately missing
- Causing false positive protection triggers

---

## 🔄 Protection Modes

### Mode 1: Standard (Disable Modules Only)

**Configuration:**
```
Protection: DM
```

**Behavior:**
1. Identifies problematic modules via jq comparison
2. Creates `disable` file in each problematic module
3. Sets `disable=partial` in settings.prop
4. Logs all disabled modules
5. Reboots device normally via `reboot` command

**Best For:**
- Quick automated recovery
- Minimal downtime
- Users who trust the protection logic
- Systems with good module hygiene

**Workflow:**
```
Bootloop Detected (loops >= threshold)
↓
Check disable_mode
↓
none → Run jq differential analysis
↓
Disable changed/new modules only
↓
Set disable=partial
↓
Reboot normally
↓
If still loops → Lockdown (disable all)
```

### Mode 2: Nuclear (Disable + Recovery)

**Configuration:**
```
Protection: DMR
```

**Behavior:**
1. Identifies problematic modules via jq comparison
2. Creates `disable` file in each problematic module
3. Sets `disable=partial` in settings.prop
4. Logs all disabled modules
5. Sets property: `setprop sys.powerctl reboot,recovery`
6. Reboots device into recovery mode

**Best For:**
- Users who want manual verification
- Complex troubleshooting scenarios
- Systems with multiple potential issues
- Creating backups before continuing
- Reviewing logs in recovery environment

**Workflow:**
```
Bootloop Detected (loops >= threshold)
↓
Check disable_mode
↓
none → Run jq differential analysis
↓
Disable changed/new modules only
↓
Set disable=partial
↓
Reboot to recovery
↓
USER: Review in recovery, verify changes
↓
USER: Reboot to system when ready
```

**From Recovery You Can:**
- Mount system and data partitions
- View AshReXcue logs: `/cache/looper/`
- View module states: `/data/adb/modules/*/disable`
- Re-enable specific modules manually (remove disable file)
- Create full device backup
- Flash additional fixes
- Access ADB for advanced debugging

---

## 📂 Logs & Debugging

### Log Storage Architecture

**Primary Location:** `/cache/looper/`

**Secondary Storage:** `/data/adb/ashlooper/`
- module.json (last known-good state)
- tmp_modules.json (current state comparison)

### Log Rotation System

**Capacity:**
- 10 files × 10 boots = 100 boot sessions tracked
- Each file ~10-50KB depending on boot complexity
- Total storage: ~100-500KB average

**RTC Status Meanings:**
- **CORRECT:** System time is after installation date (normal)
- **BACKWARD:** System time is before installation date (time drift detected)
- **INCORRECT:** Similar to BACKWARD (used interchangeably)

**When RTC is BACKWARD:**
- Indicates system clock reset (battery pull, power loss)
- Date/time in logs may be inaccurate
- Module still functions normally
- Logged for diagnostic purposes

---

## 🚀 Advanced Features

### Emergency Lockdown Mode

**Triggers When:**
- `disable_mode = "partial"` AND loops >= threshold
- Previous targeted disable didn't resolve bootloop
- No differential changes found but loops persist

**Recovery From Lockdown:**
1. Device boots successfully (minimal system)
2. Access WebUI or logs to identify root cause
3. Re-enable modules individually via module manager
4. Test stability after each re-enable
5. Use session logs to pinpoint problematic module

3. **WebUI Cleanup on Success:**
   - Prevents stale server processes
   - Removes session tokens
   - Clears monitor scripts

4. **Failsafe Recovery Paths:**
   - Manual disable via recovery: `rm -rf /data/adb/modules/AshLooper`
   - Factory reset fallback
   - Boot to safe mode (hardware button method)

---

## 🔧 Troubleshooting

### Common Issues

#### False Positives (Premature Protection)

**Symptoms:**
- Protection activates despite no actual bootloop
- Slow boot times trigger protection
- Timeout warnings in logs

**Solutions:**
1. Check actual boot times in session logs
2. Increase Boot Timeout via WebUI
   - Current: e.g., 60s
   - Recommended: Actual boot time + 20-30s buffer
3. Increase Loop Threshold if device occasionally slow
4. Review stability time setting

#### Protection Not Activating

**Symptoms:**
- Device bootloops continuously
- No modules disabled
- Logs show loop counter incrementing but no action

#### Modules Re-enabled After Protection

**Symptoms:**
- AshReXcue disables modules
- After reboot, modules are enabled again
- Protection seems ineffective

**Causes:**
1. Another module re-enabling others
2. Conflicting bootloop protector
3. Module manager auto-restore feature
4. Custom boot scripts interfering

#### Timeout Validation Errors

**Symptoms:**
- "Cannot decrease timeout by more than 10s" warning
- Settings save button stays disabled
- Timeout changes rejected

**Explanation:**
- Safety feature prevents accidental bootloops
- Prevents setting timeout too low for device
- Based on current successful boot time

#### 2. Document Issue Timeline

Create detailed report including:
- **Device:** Brand, model, Android version
- **Root:** Magisk/KernelSU/APatch version
- **Module:** AshReXcue version
- **Symptoms:** Exact behavior observed
- **Timeline:** When issue started
- **Changes:** Recent module installations/updates
- **Logs:** Relevant log excerpts (use pastebin for full logs)

#### 3. Open Issue

**GitHub Issues:**
- URL: https://github.com/RipperHybrid/AshLooper/issues
- Use issue template if provided
- Include diagnostic information
- Attach logs (sanitize personal data)

**Telegram (if available):**
- Text @Ripper_Hybrid for support

## 📋 FAQ

**Q: Will this slow down my boot?**
A: Minimally. AshReXcue adds ~150-300ms to boot time, which is negligible compared to typical boot times of 30-60+ seconds.

**Q: Can I use this with other bootloop protectors?**
A: Not recommended. Multiple protectors can conflict, each trying to disable modules independently. Choose one solution to avoid conflicts.

**Q: What if AshReXcue itself causes issues?**
A: Extremely rare, but if needed:
- Boot to recovery
- Delete `/data/adb/modules/AshLooper`
- Or create `touch /data/adb/modules/AshLooper/disable`
- Reboot

**Q: Can I configure via terminal instead of WebUI?**
A: Yes. Edit `/data/adb/modules/AshLooper/settings.prop` manually:
```bash
# Example
sed -i 's/^timeout=.*/timeout=90/' /data/adb/modules/AshLooper/settings.prop
sed -i 's/^threshold=.*/threshold=3/' /data/adb/modules/AshLooper/settings.prop
```

**Q: Will protection survive factory reset?**
A: No. Factory reset removes all modules including AshReXcue. Reinstall after initial device setup.

**Q: How do I view logs without WebUI?**
A:
```bash
# Via terminal
cat /cache/looper/AshReXcueSession-1.log

# Via ADB
adb shell cat /cache/looper/AshReXcueSession-1.log
```

**Q: What happens if jq comparison fails?**
A: AshReXcue logs the error and falls back to full lockdown mode for safety. This ensures device recovery even if differential analysis fails.

**Q: Can I exclude specific modules from protection?**
A: Not currently implemented. All modules except AshReXcue itself are subject to protection logic based on differential analysis.

**Q: Does this work with APatch?**
A: Yes! AshReXcue v9.3+ supports APatch alongside Magisk and KernelSU. Detection is automatic during installation.

---

<div align="center">

**🛡️ Stay Protected • Stay Informed • Stay in Control**

**Version 9.3** • Built with ❤️ by AshBorn

[Back to Main README](../../README.md) • [Report Issues](https://github.com/RipperHybrid/AshLooper/issues)

</div>