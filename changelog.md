## v9.2 - The "Rebirth" Update

> **📢 Infrastructure Upgrade**
> The original account is fully restored! To ensure you never lose access again, I have decentralized the project:
> * **Updates:** Now delivered via **Cloudflare** for 100% uptime, regardless of GitHub status.
> * **Mirror:** Source code and releases are fully synchronized to [**GitLab**](https://gitlab.com/RipperHybrid/AshLooper).

### 🚀 Core Service (`service.sh`)
* **Dynamic Tool Validation:** Completely rewrote process detection logic.
    * Removed hard dependencies on specific binary paths.
    * Added `validate_tools()`: Automatically detects if the system uses `pgrep` (exact/loose) or `pidof`.
    * Ensures native compatibility across **Magisk**, **KernelSU**, **APatch**, and various **Forks** without patches.
* **Stability Logic Refinement:** Optimized the `system_server` and `surfaceflinger` checks to reduce false positives on slower devices.

### ⚙️ Compatibility
* **Universal Root Support:** Verified support for Magisk, KernelSU, and their Forks.
* **Update System:** The `update.json` source has been migrated to **Cloudflare** to prevent future disruptions.