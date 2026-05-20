#!/system/bin/sh

# Kill only AshLooper's monitor.sh by full path
pkill -f "/data/adb/modules/AshLooper/monitor.sh" 2>/dev/null

# Also kill busybox httpd if port file exists
PORT_FILE="/data/adb/modules/AshLooper/nexus_secure/server_port"
if [ -f "$PORT_FILE" ]; then
    PORT=$(cat "$PORT_FILE")
    for bb in /data/adb/ksu/bin/busybox /data/adb/magisk/busybox /data/adb/ap/bin/busybox /system/bin/busybox; do
        [ -x "$bb" ] && "$bb" pkill -f "httpd -p 127.0.0.1:$PORT" 2>/dev/null && break
    done
fi

rm -rf /cache/looper 2>/dev/null
rm -rf /data/adb/ashlooper/ 2>/dev/null