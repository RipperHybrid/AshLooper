# AshLooper Module

## Description
The AshLooper module provides comprehensive boot loop prevention and management for Android devices. It monitors reboot counts, triggers recovery mode upon threshold exceedance, manages log files, and disables other modules for enhanced stability.

## Features
- Boot Loop Prevention: Monitors reboot counts and triggers recovery mode if a threshold is exceeded.
- Log File Management: Renames log files for historical tracking of device activities.
- Reboot Count Reset: Ensures accurate monitoring by resetting reboot counts upon successful boot.
- Module Disabling: Temporarily disables non-essential modules to stabilize the device during recovery mode.

## How It Works
1. **Boot Loop Monitoring:** The module continuously checks the reboot count stored in `module.prop`.
2. **Threshold Detection:** If the reboot count exceeds a predefined threshold, the module initiates recovery mode to prevent boot loops.
3. **Log File Handling:** Upon successful boot, the module renames the log file to maintain a historical record.
4. **Reboot Count Maintenance:** The module resets the reboot count to zero after a successful boot, enabling accurate monitoring.
5. **Module Disabling:** During recovery mode, non-essential modules are disabled to prioritize system stability.

## How to Use
1. **Installation:** Install the AshLooper module using a compatible modding platform such as Magisk.
2. **Activation:** Ensure the module is enabled and active within the modding platform.
3. **Automatic Functionality:** The module seamlessly manages boot loops and recovery mode, requiring no manual intervention.

## Contributors
- AshBorn ([@Ripper_Hybrid](https://github.com/Ripper_Hybrid)): Lead developer and maintainer of the AshLooper module.