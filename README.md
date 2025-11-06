# AshReXcue - Bootloop Protector

<p align="center">
  <img src="https://raw.githubusercontent.com/RipperHybrid/AshLooper/Master/.github/resources/banner.png" width="80%" alt="AshReXcue Banner">
  <img src="https://img.shields.io/badge/Compatible%20with-Magisk%20%7C%20KernelSU%20%7C%20KernelSU--Next-blueviolet" alt="Compatible with Magisk, KernelSU, KernelSU-Next">
  <br>
  
  <a href="https://github.com/RipperHybrid/AshLooper/releases/latest">
    <img src="https://img.shields.io/github/v/release/RipperHybrid/AshLooper?label=Latest%20Release&logo=git&logoColor=white&color=18673F&labelColor=2E2E3F&style=flat" alt="Latest Release">
    <img src="https://img.shields.io/github/license/RipperHybrid/AshLooper?label=License&logo=git&logoColor=white&color=18673F&labelColor=2E2E3F&style=flat" alt="License">
  </a>
  <br>
  
  <a href="https://github.com/RipperHybrid/AshLooper">
    <img src="https://img.shields.io/github/commit-activity/t/RipperHybrid/AshLooper?label=Total%20Commits&logo=git&logoColor=white&color=18673F&labelColor=2E2E3F&style=flat" alt="Total Commits">
  </a>
  <a href="https://github.com/RipperHybrid/AshLooper/commits/main">
    <img src="https://img.shields.io/github/last-commit/RipperHybrid/AshLooper?label=Last%20Commit&logo=git&logoColor=white&color=18673F&labelColor=2E2E3F&style=flat" alt="Last Commit">
  </a>
  <br>
  
  <a href="https://github.com/RipperHybrid/AshLooper/releases">
    <img src="https://img.shields.io/github/downloads/RipperHybrid/AshLooper/total?label=Total%20Downloads&logo=github&logoColor=white&color=18673F&labelColor=2E2E3F&style=flat" alt="Total Downloads">
  </a>
</p>

---

- **AshLooper has evolved into AshReXcue!** Experience advanced bootloop protection with enhanced stability monitoring and smarter module management.

### 🚀 Enhanced Protection Features:
- **Advanced Stability Monitoring** - Post-boot process verification for system stability
- **Intelligent Module Detection** - Tracks module changes including size, version, and status
- **Configurable Monitoring** - Customizable stability periods and failure thresholds
- **Professional Web UI v2.0** - Enhanced interface with better session management
- **Improved Error Handling** - Better recovery from system crashes and boot failures

---

## 📌 Core Features

- **Boot Loop Detection** – Advanced detection of repeated failed boots caused by malfunctioning modules
- **Smart Module Management** – Intelligently disables problematic modules while preserving working ones
- **Threshold-Based Protection** – Configurable boot attempt thresholds for automatic intervention
- **Persistent Tracking** – Maintains boot attempt counts through power cycles and reboots
- **Multi-Root Support** – Compatible with Magisk, KernelSU, and KernelSU-Next
- **Real-time Monitoring** – Continuous system process verification during boot

---

## ⚙️ Protection Modes

- **Targeted Disable Mode** – Precisely disables only problematic modules causing bootloops
- **Comprehensive Protection** – Falls back to full module disable if targeted approach fails
- **Advanced Recovery Options** – Configurable reboot to recovery for advanced users

---

## 🛠️ Installation

### ⚠️ Compatibility

This module is built specifically for **Magisk** and **KernelSU**.

**Apatch Users:** This module will **fail to install** on Apatch. The installation script currently only detects Magisk or KernelSU and will abort if neither is found.

I have not tested Apatch and cannot guarantee support. However, if you are willing to help test, please DM me. I can provide a test version and am open to fixing any problems that arise.

### Steps

1.  Download and flash **AshReXcue** via Magisk or KernelSU.
2.  Configure protection settings during installation:
    * Select your preferred protection mode
    * Set boot attempt threshold (1-4 recommended)
3.  Reboot your device - AshReXcue will automatically begin monitoring and protection.

---

## 🌐 Web Interface

### Access the built-in Web UI to:

- View detailed boot session logs
- Monitor system stability in real-time
- Configure module settings
- Analyze boot attempts and module changes
- Export logs for debugging

---

## 🔔 Important Notes

- **Advanced Recovery Recommended** – DMR mode works best with custom recoveries (TWRP, OrangeFox, etc.)
- **Backup Important Data** – Always maintain backups of critical data
- **Stability Monitoring** – New AshReXcue features provide enhanced system stability verification
- **Persistent Protection** – Boot tracking survives complete power loss and hard resets

---

## 📄 License

Licensed under the [GPL-3.0 License](LICENSE).

---

## 💡 Credits & Dependencies

- **JSON Processing:** [jq](https://jqlang.github.io/jq/) – v1.7.1 for reliable JSON parsing

---

## ⚠️ Disclaimer

AshReXcue is designed to protect your device from bootloops caused by module conflicts. While extensive testing ensures reliability, users should always maintain backups and use the tool responsibly.

---

## 📞 Support & Community

For assistance, bug reports, or feature requests:
- **Telegram:** [Ripper Hybrid](https://t.me/Ripper_Hybrid)
- **GitHub Issues:** Report bugs and request features
- **Documentation:** Check the wiki for detailed guides

---

*AshReXcue: Your reliable rescue from bootloop disasters* 🔄🛡️