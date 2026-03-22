### 📝 Changelog / Release Notes

# 🚀 AshReXcue v9.6 Update

### 🛠️ Core Engine Upgrades
* **SystemUI Crash Detection:** The stability monitor now actively watches `com.android.systemui`. If SystemUI crashes and restarts 3 times during the stability window, it is instantly flagged as a bootloop and triggers protection.
* **Crash Reboot Cycling:** Completely replaced the old hard-lockdown triggers. If a boot times out or critical services fail, the script now uses a new `trigger_crash_reboot` function to safely cycle the device and let the standard loop counter process the strike.
* **Manual Reboot Penalty Fix:** `service.sh` now caches your actual loop count and resets the active properties early. This prevents you from getting a false bootloop strike if you manually reboot your phone while the script is still running.

### 🎨 Terminal & Log Visuals Overhaul
* **Log Color Legend:** Added a clean, sticky legend at the top of the terminal viewer so you always know exactly what the log colors represent.
* **Enhanced Syntax Highlighting:** Log text now defaults to a sleek Mint (`#64FFD2`), Warnings to Purple (`#B677FF`), and Errors to vibrant Red (`#ef4444`).
* **Dynamic Log Parsing:** The WebUI now actively scans for specific system events (like *"Lockdown Mode Activated"*, *"crashed and restarted"*, or *"Skipping whitelisted"*) and color-codes them dynamically on the fly.

### ⚙️ Advanced Settings Controls
* **Variable Step Sizes:** Long-press (or click-and-hold) the `+` or `-` buttons on the Stability Time setting to trigger a new interactive pop-up bubble! You can now adjust the increment step size (from 1s up to 5s) for much faster, precise tuning.
* **Haptic Feedback:** The new long-press menu includes a slight vibration cue on supported devices to let you know the menu has been triggered.
* **Expanded Stability Range:** The limits for Stability Time have been widened, now allowing you to set it anywhere from 35s to 120s.