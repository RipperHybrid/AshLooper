## Version 6.0 Changelog

### AshLooper Module Script (Version 6.0) Critical Fixes:

- **Complete file structure overhaul:**
  - Simplified the module layout for easier maintenance.
  - Moved all script logic into `func.sh`.
  - Added a standalone `jq` binary for better and faster JSON handling.
  - Removed legacy folders (`common`, `addon`, etc.) and merged their functionality.

- **Smarter bootloop protection:**
  - No longer disables all modules on the first bootloop.
  - If a new or updated module causes a bootloop, only that specific module is disabled.
  - If the device still fails to boot after disabling the changed module, all modules are disabled as a fallback (legacy behavior).

- **General improvements:**
  - Cleaned up and optimized all scripts.
  - Improved reliability and maintainability.
  - Updated documentation and logs for better clarity.

---

**Summary:**  
This update brings a modernized, cleaner structure and much smarter bootloop recovery—making troubleshooting safer and more precise than ever.