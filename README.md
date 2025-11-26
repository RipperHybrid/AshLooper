# AshReXcue - Bootloop Protector

<div align="center">
  <img src="https://raw.githubusercontent.com/RipperHybrid/AshLooper/Master/.github/resources/banner.png" width="60%" alt="AshLooper Banner">
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

> **⚠️ Notice: Resilience & Backup Plans**
> Following a recent temporary suspension of this account, I have updated the infrastructure to prevent future disruptions:
> 
> 1.  **Updates:** The update check has moved to **Cloudflare**. Your module will check for updates reliably, regardless of GitHub's status.
> 2.  **Mirrors:** This repository is fully synchronized with [**GitLab**](https://gitlab.com/RipperHybrid/AshLooper).
>
> If this page is ever down, please check the GitLab link for the latest releases.

**AshReXcue** (formerly AshLooper) is a sophisticated boot protection module designed for **Magisk**, **KernelSU**, and their various **Forks**.

Unlike basic bootloop protectors that simply disable all modules upon a failed boot, AshReXcue uses **Smart Detection** to identify recently added or modified modules and targets them first. It features a fully interactive **WebUI Dashboard** embedded directly in your root manager, allowing you to view logs, manage protection settings, and analyze boot sessions without leaving the app.

> **🧪 Help Me Expand Compatibility**
> If your root solution (or specific fork) is not listed or supported, **please open an issue or reach out!** I am looking for testers to help verify and add compatibility for other root environments.

---

## ✨ Key Features

### 🛡️ Intelligent Protection
* **Smart Differential Analysis:** Maintains a history of your installed modules. If a bootloop occurs, it compares the current state to the last successful boot to pinpoint *new* or *changed* modules.
* **Stability Monitoring:** Doesn't just wait for `sys.boot_completed`. It monitors critical system processes (`system_server`, `surfaceflinger`) for a user-defined stability period (default 20s) to ensure the device is actually usable, not just "booted".
* **Dynamic Timeout:** Automatically adjusts the boot timeout limit based on your device's actual boot speed.

### 💻 Modern WebUI Dashboard
* **Live Log Viewer:** Read protection logs directly in the app with syntax highlighting.
* **Session History:** Browse previous boot sessions (Successful vs. Failed/Incomplete).
* **Theming:** Switch between **Dark**, **Light**, and **Retro (Amber CRT)** themes.
* **Settings Management:** Adjust timeout, threshold, and stability time via a graphical interface.
* **File Management:** Copy logs to clipboard or save them to `/storage/emulated/0/Download/`.

### ⚙️ Configurable Modes
During installation (via Volume Keys), you can choose:
1.  **Disable Modules:** Disables problematic modules and reboots normally.
2.  **Disable & Recovery:** Disables problematic modules and reboots into Recovery mode.

---

## 📥 Installation

1.  Open **Magisk**, **KernelSU**, or your **Fork Manager**.
2.  Install the `AshReXcue` zip file.
3.  **Follow the Volume Key instructions** in the terminal:
    * **Step 1:** Select Protection Mode (Disable Only vs. Disable + Recovery).
    * **Step 2:** Select Loop Threshold (How many failed boots trigger protection).
4.  Reboot your device.

---

## 🛠️ How It Works

1.  **Boot Start:** AshReXcue initializes early in `post-fs-data`.
2.  **Monitoring:** It waits for the boot to complete within the defined `timeout`.
3.  **Stability Check:** Once booted, it monitors system stability for the configured time (`stability_time`).
4.  **Success:** If stable, it saves the current list of modules as a "Known Good" state.
5.  **Failure:**
    * **Threshold Not Reached:** Increments loop counter.
    * **Threshold Reached:**
        1.  Checks for **New/Changed** modules since the last good boot.
        2.  **Targeted Strike:** Disables *only* those suspicious modules.
        3.  **Lockdown:** If no changes are detected but loops continue, it disables *all* modules (except itself) to save the device.

---

## 🖥️ Dashboard & Settings

Access the dashboard via your Root Manager's module list (WebUI support required, e.g., KernelSU Next).

### Adjustable Settings
You can modify these values safely through the WebUI:

| Setting | Default | Range | Description |
| :--- | :--- | :--- | :--- |
| **Timeout** | 60s | 20s - 300s | Maximum time allowed for the device to boot before protection kicks in. |
| **Threshold** | User Set | 1 - 5 | Number of failed boots allowed before modules are disabled. |
| **Stability** | 20s | 10s - 40s | How long to monitor `system_server` after boot to ensure no crashes occur. |

> **⚠️ Note:** The system prevents lowering the Timeout by more than 10 seconds at a time to prevent accidental loops caused by aggressive settings.

---

## 📂 Logs & Debugging

AshReXcue keeps detailed logs of every boot session.

* **Log Location:** `/cache/looper/`
* **Log Format:** `AshReXcueSession-YYYY-MM-DD.log`
* **History:** Retains the last 10 boot sessions.

You can easily export these logs via the WebUI by clicking the **Save** or **Copy** icons.

---

## 🤝 Credits
- **jq Binary** – [jq](https://jqlang.org)
- **Cloudflare** – [Pages](https://pages.cloudflare.com/) (Web Page Hosting & Update System)

## 👤 Author
- **AshBorn** - ([@RipperHybrid](https://github.com/RipperHybrid))

---

<div align="center">
    <sub>Powered by <strong>Cloudflare</strong> • Stay Protected by <strong>AshReXcue</strong></sub>
</div>