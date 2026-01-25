# AshReXcue - Bootloop Protector

<div align="center">
  <img src="https://raw.githubusercontent.com/RipperHybrid/AshLooper/Master/.github/resources/banner.png" width="40%" alt="AshLooper Banner">
  <br>
  <img src="https://img.shields.io/badge/Compatible%20with-Magisk%20%7C%20KernelSU%20%26%20Forks-blueviolet" alt="Compatibility Badge">
  <br>
  
  <a href="https://github.com/RipperHybrid/AshLooper/releases/latest">
    <img src="https://img.shields.io/github/v/release/RipperHybrid/AshLooper?label=Latest%20Release&logo=git&logoColor=white&color=18673F&labelColor=2E2E3F&style=flat" alt="Latest Release">
  </a>
  
  <a href="https://ashrexcue.pages.dev/">
    <img src="https://img.shields.io/website?url=https%3A%2F%2Fashrexcue.pages.dev&up_message=Online&style=flat&logo=cloudflare&label=Cloudflare%20Page&color=F38020&logoColor=white" alt="Website Status">
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
    <img src="https://img.shields.io/github/downloads/RipperHybrid/AshLooper/total?label=Total%20Downloads&logo=github&logoColor=orange&color=18673F&labelColor=2E2E3F&style=flat" alt="Total Downloads">
  </a>
</div>

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Orbitron&weight=500&pause=1000&color=41F791&center=true&vCenter=true&width=935&height=70&lines=Advanced+Bootloop+Protection;Now+featuring+a+full+WebUI!;Smart+Detection+%26+Stability+Checks;Native+Magisk,+KernelSU+%26+Forks+Support)](https://git.io/typing-svg)

---

## 📖 About

**AshReXcue** (formerly AshLooper) is a sophisticated boot protection module designed for **Magisk**, **KernelSU**, **APatch**, and their various **Forks**.

Unlike basic bootloop protectors, AshReXcue uses **Smart Detection** to identify recently added or modified modules and targets them first. It features a fully interactive **WebUI Dashboard** with secure session management for viewing logs and adjusting protection settings.

**📚 [Read Full Documentation & Features](.github/resources/feature.md)**

---

## ✨ Key Features

- 🛡️ **Smart Differential Analysis** - Targets only new/changed modules using jq-powered comparison
- 💻 **Modern WebUI Dashboard** - Live logs, session history, and real-time settings management
- 🔒 **Secure WebUI Sessions** - Random ports, unique tokens, auto-timeout (5min max / 2min idle)
- ⚙️ **Configurable Protection Modes** - Standard (Disable) or Nuclear (Disable + Recovery)
- 📊 **Multi-Boot Session Tracking** - View individual boot sessions with RTC status validation
- 🎨 **Dark Retro Theme** - Amber CRT-style terminal interface
- 🔧 **Advanced Stability Monitoring** - System process verification with configurable checks

---

## 📥 Installation

1. Open **Magisk**, **KernelSU**, **APatch**, or your **Fork Manager**
2. Install the `AshReXcue` zip file
3. **Follow the Volume Key instructions:**
   - **Step 1:** Select Protection Mode (Standard or Nuclear)
   - **Step 2:** Select Loop Threshold (1-4 boots)
   - **Step 3:** System calibration (automatic)
   - **Step 4:** Enable/Disable Advanced Stability Monitoring
4. Reboot your device

---

## 🖥️ Dashboard Access

Access the WebUI dashboard through your module manager's "Open" button or via terminal action script.

**Security Features:**
- Localhost-only access (127.0.0.1)
- Randomized port (6000-10000 range)
- Unique session token authentication
- Auto-shutdown: 5 minutes maximum or 2 minutes idle
- Activity heartbeat tracking

**Dashboard Features:**
- 📋 **Session Browser** - View individual boot sessions with status indicators
- 📊 **Live Log Viewer** - Color-coded logs with syntax highlighting
- ⚙️ **Settings Editor** - Adjust timeout, threshold, and stability time
- 💾 **Export Options** - Copy to clipboard or save to Downloads
- 🔍 **Log Filtering** - Real-time search through log content

---

## 📂 Important Notices

> **⚠️ Backup & Mirrors**
> 
> - **Updates:** Now hosted on **Cloudflare** for reliability
> - **Mirror:** Full sync available at [**GitLab**](https://gitlab.com/RipperHybrid/AshLooper)
> 
> **🧪 Need Help With Compatibility?**
> If your root solution isn't supported, please open an issue!

---

## 🤝 Credits

- **jq Binary** – [jq](https://jqlang.org) - JSON processing for module comparison
- **Cloudflare** – [Pages](https://pages.cloudflare.com/) (Hosting & Updates)

## 👤 Author

- **AshBorn** - [@RipperHybrid](https://github.com/RipperHybrid)

---

<div align="center">
    <sub>Powered by <strong>AshReXcue</strong></sub>
</div>