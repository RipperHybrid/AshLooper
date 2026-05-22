### 📝 Changelog / Release Notes

# 🚀 AshReXcue v9.8 Update

### 🛠️ Core Engine & Stability Refinements

* **Surgical Daemon Tracking:** Removed logd from the extra_stability watchlist inside service.sh. The stability engine now exclusively targets critical system-halting daemons like vold and servicemanager.
* **False-Positive Eradication:** Fixed an issue where AshReXcue would incorrectly trigger an anti-bootloop rescue when aggressive performance modules (like Pixel Tune / ptune) intentionally killed Android logging to save system resources.
* **Zero-Config Adaptability:** Instead of bloating the module with manual bypass toggles or complicated settings, the architecture was kept completely lean. AshReXcue natively ignores intentional logd shutdowns while maintaining strict protection against true low-level hardware or filesystem hangs—requiring absolutely zero user configuration.