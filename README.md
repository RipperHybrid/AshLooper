# AshReXcue - Bootloop Protector

<div align="center">
  <img src="https://raw.githubusercontent.com/RipperHybrid/AshLooper/Master/.github/resources/banner.png" width="40%" alt="AshLooper Banner">
  <br>
  <img src="https://img.shields.io/badge/Compatible%20with-Magisk%20%7C%20KernelSU%20%7C%20Apatch%20%26%20Forks-blueviolet" alt="Compatibility Badge">
  <br>

  <a href="https://github.com/RipperHybrid/AshLooper/releases/latest">
    <img src="https://img.shields.io/github/v/release/RipperHybrid/AshLooper?label=Latest%20Release&logo=git&logoColor=white&color=18673F&labelColor=2E2E3F&style=flat" alt="Latest Release">
  </a>

  <a href="https://github.com/RipperHybrid/AshLooper">
    <img src="https://img.shields.io/github/commit-activity/t/RipperHybrid/AshLooper?label=Total%20Commits&logo=git&logoColor=white&color=18673F&labelColor=2E2E3F&style=flat" alt="Total Commits">
  </a>
  <br>

  <a href="https://github.com/RipperHybrid/AshLooper/commits/main">
    <img src="https://img.shields.io/github/last-commit/RipperHybrid/AshLooper?label=Last%20Commit&logo=git&logoColor=white&color=18673F&labelColor=2E2E3F&style=flat" alt="Last Commit">
  </a>

   <a href="https://github.com/RipperHybrid/AshLooper/releases">
    <img src="https://img.shields.io/github/downloads/RipperHybrid/AshLooper/total?label=Total%20Downloads&logo=github&logoColor=orange&color=18673F&labelColor=2E2E3F&style=flat" alt="Total Downloads">
  </a>
  <br>
</div>

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Orbitron&weight=500&pause=1000&color=41F791&center=true&vCenter=true&width=935&height=70&lines=Advanced+Bootloop+Protection;Interactive+WebUI+Dashboard;Smart+Differential+Analysis;Magisk,+KernelSU,+APatch+%26+Forks)](https://git.io/typing-svg)

---

## 📖 About

**AshReXcue** (formerly AshLooper) is a sophisticated, open-source boot protection module designed for **Magisk**, **KernelSU**, **APatch**, and their various **Forks**.

Unlike basic protectors that blindly disable all modules during a bootloop, AshReXcue utilizes **Smart Differential Analysis** to identify and target only the problematic modules. It features a fully interactive, locally hosted **WebUI Dashboard** for managing your protection parameters, reviewing boot logs, and configuring system behaviors—offering a completely local experience with no cumbersome login processes or external dependencies.

### 📚 [Read The Full Feature Documentation](.github/resources/feature.md)

---

## ✨ Core Architecture

| Category | Description |
| :--- | :--- |
| 🛡️ **Smart Detection** | Differential tracking detects exactly what changed since the last successful boot to isolate bad modules. |
| 💻 **Interactive WebUI** | A self-hosted localhost dashboard for real-time configuration, log viewing, and system management. |
| 🔒 **Secure Environment** | Built-in security measures including dynamic port generation, session timeouts, and strict local authentication. |
| ⚙️ **Customizable Logic** | Highly configurable thresholds, dynamic stability timeframes, and multiple lockdown behaviors to suit your setup. |
| 📝 **Module Access Control** | Advanced filtering and whitelisting capabilities to protect essential system modules from automated lockdowns. |

---

## 📥 Installation

Install via your preferred root manager (**Magisk**, **KernelSU**, or **APatch**).

The module features an interactive installation process. Follow the on-screen prompts using your device's physical volume keys or touch screen (if supported) to configure your baseline protection settings.

> **General Controls:**
> * **Vol+ / Touch** = Select / Next Option
> * **Vol-** = Confirm Selection

*Note: All settings configured during installation can be modified dynamically at any time via the WebUI or the local command menu.*

---

## 🖥️ Accessing the Dashboard & Menu

AshReXcue features an interactive CLI-based **Action Menu** that serves as the central hub for managing the module for magisk. From this menu, you can securely launch the WebUI on localhost, add/remove modules from your Whitelist, or safely exit.

You can access this menu dynamically based on your root manager:

### Method 1: Root Manager UI (KernelSU / APatch)
Simply tap the **"WebUI"** button directly within your module manager application.

### Method 2: Magisk & Universal
Tap the **"Action"** button directly within the Magisk module menu. This seamlessly executes the module's built-in `action.sh` script, launching the interactive Action Menu right on your screen.

---

## 📂 Important Notices

> [!TIP]
> **Mirrors & Updates**
> * **Primary:** [GitHub Releases](https://github.com/RipperHybrid/AshLooper/releases)
> * **Mirror:** [GitLab Repository](https://gitlab.com/RipperHybrid/AshLooper)

> [!WARNING]
> **Compatibility**
> Do not use this module alongside other bootloop protectors (e.g., standard Magisk Bootloop Saver). They will conflict and may cause severe boot issues.

---

## 🤝 Credits

* **jq Binary** – [jqlang.org](https://jqlang.org) - The engine behind the JSON differential analysis.
* **Cloudflare** – [Pages](https://pages.cloudflare.com/) - Reliable hosting infrastructure.

## 👤 Author

- **AshBorn** - [@RipperHybrid](https://github.com/RipperHybrid)

---

<div align="center">

**🛡️ AshReXcue**<br>
*Your friendly neighborhood root savior.*

> _Built by **AshBorn**_<br>
> *I put the ‘pro’ in procrastinate 🙂*

</div>