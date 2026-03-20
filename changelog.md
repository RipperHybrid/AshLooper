# 🚀 AshReXcue v9.5 Update

### ✨ WebUI V2.4 & Navigation Overhaul
* **FAB Navigation:** Replaced the static tab bar with a slick Floating Action Button (FAB) menu for navigating between Logs, Whitelist, and Settings.
* **Sticky Settings Footer:** The Settings tab now tracks pending changes and displays a bottom sticky action bar to save or discard unsaved modifications.

### 🛡️ New Module Whitelist System
* **Whitelist Manager:** Introduced a dedicated UI tab to protect specific modules from being disabled during a bootloop lockdown. Supports swipe gestures to toggle between "Normal" and "Whitelist" views.
* **Core Integration:** `service.sh` and `utils.sh` now read the whitelist array to intentionally skip protected modules during `disable_new_mods` and `lockdown` events.
* **Auto-Cleanup:** The service script now automatically cleans the whitelist string on boot, removing any orphaned modules that have been uninstalled.

### ⚙️ Action Menu & Input Upgrades (VSKL)
* **Interactive CLI Menu:** `action.sh` is no longer just a WebUI launcher. It now features a full 4-option interactive menu (Open WebUI, Add to Whitelist, Remove from Whitelist, Exit).
* **Touch Support (VSKL):** Replaced the old `chooseport` in `action.sh` with a modified VSKL (Volume/Screen Key Listener) script, allowing you to use both volume buttons and screen touches to navigate the menu.

### 🔐 Security & CGI Refactor
* **Zero-Escape CGI Execution:** Completely eliminated quote-escaping hell in `cgi-bin/exec` by piping raw commands directly to `stdin` (`printf '%s\n' "$RAW_CMD" | su -c "$BB sh"`).
* **Hash-Based Auth:** The WebUI no longer fetches the token via a separate HTTP request. The token is now securely passed directly via the URL hash fragment (`#TOKEN`) and cleared from the browser history instantly.