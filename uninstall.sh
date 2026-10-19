#!/system/bin/sh

# Clean up leftover state on uninstall.
rm -rf /data/adb/ashlooper/ 2>/dev/null
rm -rf /cache/looper 2>/dev/null