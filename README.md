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

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Orbitron&weight=500&pause=1000&color=41F791&center=true&vCenter=true&width=935&height=70&lines=Advanced+Bootloop+Protection;Boot+Script+%2B+Module+Guard;Interactive+WebUI+Dashboard;Smart+Differential+Analysis;Magisk,+KernelSU,+APatch+%26+Forks)](https://git.io/typing-svg)

---

## 📖 About

**AshReXcue** (formerly AshLooper) is a sophisticated, open-source boot protection module designed for **Magisk**, **KernelSU**, **APatch**, and their various **Forks**.

Unlike basic protectors that blindly disable all modules during a bootloop, AshReXcue utilizes **Smart Differential Analysis** to identify and target only the problematic modules and, as of v9.9, early/late boot scripts too (`service.d`, `post-mount.d`, `post-fs-data.d`). It features a fully interactive, locally hosted **WebUI Dashboard** for managing your protection parameters, reviewing boot logs, and configuring system behaviors offering a completely local experience with no cumbersome login processes or external dependencies.

### 📚 [Read The Full Feature Documentation](.github/resources/feature.md)

---

## ✨ Core Architecture

| Category | Description |
| :--- | :--- |
| 🛡️ **Smart Detection** | Differential tracking (hash + size + status) detects exactly what changed since the last successful boot to isolate bad modules **and** boot scripts, backed by aggressive `com.android.systemui` crash-loop monitoring (3-strike threshold). |
| 📜 **Boot Script Guard** | Optionally tracks and protects `service.d`, `post-mount.d`, and `post-fs-data.d` scripts the same way it protects modules isolating offenders into a recovery vault instead of deleting them outright. |
| 💻 **Interactive WebUI** | A self-hosted localhost dashboard (V2.6) featuring a claymorphic/neumorphic dark aesthetic, a unified **Items** control center, a global unsaved-changes tracker, and built-in diagnostics (Activity Log + JSON Viewer). |
| 🔒 **Secure Environment** | Built-in security measures including strict `/proc/net/tcp` port collision checks, decoupled static `monitor.sh` background tracking, and hash-based local authentication. |
| ⚙️ **Customizable Logic** | Highly configurable thresholds, dynamic stability timeframes, toggleable extra daemon checks, and intelligent crash-reboot cycling with active state-locks to prevent race conditions. |
| 📝 **Access Control** | A unified Whitelist Manager covering both modules and boot scripts, plus a dedicated Items tab to pause, restore, or permanently remove any tracked item. |

---

## 📥 Installation

Install via your preferred root manager (**Magisk**, **KernelSU**, or **APatch**).

The module features an interactive installation process. Follow the on-screen prompts using your device's physical volume keys or touch screen to configure your baseline protection settings, including whether to enable **Boot Script Monitoring**.

> **General Controls (VSKL):**
> * **Vol+ / Screen Touch** = Select / Next Option
> * **Vol-** = Confirm Selection

*Note: All settings configured during installation can be modified dynamically at any time via the WebUI or the local Action Menu.*

---

## 🖥️ Accessing the Dashboard & Action Menu

AshReXcue features an interactive CLI-based **Action Menu** powered by VSKL (Volume & Screen Key Listener). This serves as the central hub for managing the module. From this 5-option menu, you can securely launch the WebUI on localhost, add/remove items from your Whitelist, **restore previously disabled modules/scripts**, or safely exit.

You can access this menu dynamically based on your root manager:

### Method 1: Root Manager UI (KernelSU / APatch)
Simply tap the **"WebUI"** or **"Action"** button directly within your module manager application to spawn the interactive menu.

### Method 2: Magisk & Universal
Tap the **"Action"** button directly within the Magisk module menu. This seamlessly executes the module's built-in `action.sh` script, launching the interactive Action Menu right on your screen.

---

## 📁 Important Notices

<details>
<summary><strong>Infrastructure Redundancy details</strong></summary>
<br>

> [!TIP]
> **Mirrors & Updates**
> * **Primary:** [GitHub Releases](https://github.com/RipperHybrid/AshLooper/releases)
> * **Mirror:** [GitLab Repository](https://gitlab.com/RipperHybrid/AshLooper)

</details>

> [!WARNING]
> **Compatibility**
> Do not use this module alongside other bootloop protectors (e.g., standard Magisk Bootloop Saver). They will conflict and may cause severe boot issues.

---

## 🤝 Credits

* **jq Binary** – [jqlang.org](https://jqlang.org) - The engine behind the JSON differential analysis.
* **Cloudflare** – [Pages](https://pages.cloudflare.com/) - Reliable hosting infrastructure.

## 👤 Author

- **AshBorn** - [@RipperHybrid](https://github.com/RipperHybrid)