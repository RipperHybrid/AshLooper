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

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Orbitron&weight=500&pause=1000&color=41F791&center=true&vCenter=true&width=935&height=70&lines=Advanced+Bootloop+Protection;Now+featuring+a+full+WebUI!;Smart+Detection+%26+Stability+Checks;Native+Magisk,+KernelSU+%26+Forks+Support)](https://git.io/typing-svg)

---

## 📖 About

**AshReXcue** (formerly AshLooper) is a sophisticated boot protection module designed for **Magisk**, **KernelSU**, **APatch**, and their various **Forks**.

Unlike basic bootloop protectors that blindly disable modules, AshReXcue uses **Smart Differential Analysis** to identify exactly which module changed since the last successful boot. It features a fully interactive **WebUI Dashboard** for viewing logs and managing protection settings in real-time.

### 📚 [Read The Full Documentation](.github/resources/feature.md)

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 🛡️ **Smart Detection** | Targets *only* new or modified modules using `jq`-powered JSON comparison. |
| 💻 **WebUI Dashboard** | A "Dark Retro" interface for live logs, session history, and settings. |
| 🔒 **Secure Sessions** | Random ports, unique tokens, and auto-shutdown (5min max / 2min idle). |
| ⚙️ **Flexible Modes** | Choose between **Standard** (Disable) or **Nuclear** (Disable + Recovery). |
| 📊 **Session History** | Track up to 100 previous boot attempts with RTC status validation. |
| 🔧 **Stability Checks** | Monitors `system_server` and `surfaceflinger` to ensure a usable UI. |

---

## 📥 Installation Guide

Install via **Magisk**, **KernelSU**, or **APatch**. During the flashing process, use your **Volume Keys** to configure the core settings:

> **Volume Key Controls:**
> * **Vol+** = Select Option
> * **Vol-** = Confirm & Next

1.  **Select Protection Mode:**
    * `Standard`: Disables bad modules & Reboots System.
    * `Nuclear`: Disables bad modules & Reboots to Recovery.
2.  **Set Loop Threshold:**
    * Choose between `1` to `4` failed boots before protection kicks in.
3.  **Automatic Calibration:**
    * The installer will auto-detect your system services.
4.  **Advanced Monitor:**
    * Enable/Disable extra checks for `servicemanager` and `vold`.

---

## 🖥️ Dashboard Access

You can access the WebUI Dashboard to view logs and change settings without rebooting.

### For KernelSU / APatch Users
Simply click the **"WebUI"** or **"Open"** button in your module manager app.

### For Magisk Users
You have two ways to access the dashboard:
1.  **Action Button:** Simply tap the **"Action"** button inside the Magisk Module list.
2.  **Terminal:** Run the following command in Termux or ADB:
    ```bash
    su -c "/data/adb/modules/AshLooper/action.sh"
    ```

---

## 📂 Important Notices

> [!TIP]
> **Mirrors & Updates**
> * **Primary:** GitHub Releases
> * **Mirror:** [GitLab Repository](https://gitlab.com/RipperHybrid/AshLooper)

> [!WARNING]
> **Compatibility**
> Do not use this module alongside other bootloop protectors. They will conflict and may cause issues.

---

## 🤝 Credits

* **jq Binary** – [jqlang.org](https://jqlang.org) - The engine behind the differential analysis.
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