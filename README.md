# AshLooper

<p align="center">
  <img src="https://raw.githubusercontent.com/RipperHybrid/AshLooper/Master/.github/resources/banner.png" width="80%" alt="Banner">
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

## 📌 Features

- **Boot Loop Detection** – Detects repeated failed boots caused by malfunctioning modules.
- **Smarter Module Disabling** – Only disables newly installed or updated modules that trigger a bootloop; if issues persist, all modules are disabled as a fallback.
- **Threshold-Based Action** – Automatically takes action if boot attempts exceed your configured threshold.
- **Persistent Tracking** – Keeps track of boot attempts even after full power-off or battery removal.
- **Magisk & KernelSU Compatible** – Works with both Magisk and KernelSU for wide support.

---

## ⚙️ Modes

- **Targeted Disable Mode** – Disables only the new or updated module that caused a bootloop.
- **Fallback Disable All Mode** – If the problem persists, disables all modules except AshLooper.

---

## 🛠️ Installation

1. Download and flash **AshLooper** via Magisk.
2. Configure your desired boot threshold and mode (see documentation).
3. Reboot your device and AshLooper will automatically monitor and protect against bootloops.

---

## 🔔 Notes

- **DMR mode is recommended only if your device has an advanced recovery (such as TWRP, OrangeFox, etc.) that allows you to fix a bootloop or manually manage files and modules.**
  If you do not have such a recovery, avoid using DMR mode.
- Boot attempt tracking is robust and persists even after a complete power-off.

---

## 📄 License

Licensed under the [GPL-3.0 License](LICENSE).

---

## 💡 Credits

- **JSON Processor:** [jq](https://jqlang.github.io/jq/) – v1.7.1, included for fast and reliable JSON parsing
- **Banner By:** [Adi](https://t.me/adiLohar) – [Banner Channel](https://t.me/WDableuW)

---

## Disclaimer

AshLooper is designed to help protect your device from bootloops caused by malfunctioning modules. While every effort has been made to ensure reliability, please use this tool responsibly and always keep backups of important data.

---

## Support

For help or to report an issue, contact [Ripper Hybrid](https://t.me/Ripper_Hybrid) on Telegram.
