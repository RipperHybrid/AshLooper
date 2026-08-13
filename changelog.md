# 🚀 AshReXcue v9.9 Update Changelog

### 🛡️ Core Engine & Boot Script Protection

* **Boot Script Defense Shield:** AshReXcue no longer just monitors Magisk/KSU modules. It now actively tracks, hashes, and protects early/late boot scripts located in `service.d`, `post-mount.d`, and `post-fs-data.d`.
* **Smart Script Isolation:** When a bootloop is detected, non-whitelisted scripts are safely moved to an internal vault (`/data/adb/ashlooper/`) and replaced with a `chmod 000` dummy file to seamlessly block execution without permanent data loss.
* **New Action Menu Function:** Built a brand new `restore_menu` function into the physical `action.sh` volume-key menu. You can now recover disabled modules and isolated scripts directly from the command line, bypassing the WebUI entirely.
* **Dynamic Status Updates:** The module's description in your root manager now updates live during the boot sequence (e.g., *"⏳ Booting... Monitoring stability..."*) and safely restores its original description once the system stabilizes.

### 🎨 WebUI Overhaul & "Items" Management (V2.6)

* **New Claymorphic UI:** A complete visual rewrite. AshReXcue now sports a deep, modern dark theme utilizing advanced claymorphic/neumorphic shadows, floating status islands, and a highly responsive bottom navigation pill.
* **New 'Items' Control Center:** Introduced a dedicated `Items` tab. You can now natively pause, resume, delete, or restore both root modules and `.d` boot scripts directly from the AshReXcue interface.
* **Global Pending Changes Engine:** Say goodbye to losing unsaved settings. A unified 'Changes Pill' now sits above the navigation bar, actively tracking your unsaved modifications across the Settings, Whitelist, and Items tabs, complete with contextual warning colors.
* **Developer Diagnostics:**
* **Activity Log:** A built-in command tracker that logs the exact shell commands executed by the WebUI in the background.
* **JSON Viewer:** A native interface to inspect the raw `module.json` state directly from the app header.