#!/system/bin/sh
MODPATH="${0%/*}"
STATE_FILE="$MODPATH/.session_state"
TIMEOUT=120

find_busybox() {
    for candidate in /data/adb/ksu/bin/busybox /data/adb/magisk/busybox /data/adb/ap/bin/busybox /system/bin/busybox; do
        if [ -f "$candidate" ] && [ -x "$candidate" ]; then
            if "$candidate" true >/dev/null 2>&1; then
                echo "$candidate"
                return 0
            fi
        fi
    done
    return 1
}

send_notification() {
    for i in 1 2 3; do
        su 2000 -c "cmd notification post -t 'AshReXcue' '$1' '$2'" >/dev/null 2>&1 && break
        sleep 1
    done
}

cleanup_and_exit() {
    BB=$(find_busybox)
    [ -n "$BB" ] && "$BB" pkill -f "httpd -p 127.0.0.1:$PORT"
    send_notification "WebUI Stopped" "$1"
    rm -rf "$STATE_FILE" "$MODPATH/nexus_secure"
    exit 0
}

BB=$(find_busybox)
[ -z "$BB" ] && cleanup_and_exit "Error: Busybox not found"

while [ -f "$STATE_FILE" ]; do
    sleep 10
    read PORT DEADLINE LAST_ACTIVITY < "$STATE_FILE"
    PORT=$(echo "$PORT" | tr -d '\r' | tr -d ' ')
    DEADLINE=$(echo "$DEADLINE" | tr -d '\r' | tr -d ' ')
    LAST_ACTIVITY=$(echo "$LAST_ACTIVITY" | tr -d '\r' | tr -d ' ')

    [ -z "$PORT" ] || [ -z "$DEADLINE" ] || [ -z "$LAST_ACTIVITY" ] && continue

    if ! "$BB" ps | grep -v grep | grep -q "httpd -p 127.0.0.1:$PORT"; then
         break
    fi

    CURRENT=$("$BB" date +%s)

    if [ "$CURRENT" -ge "$DEADLINE" ]; then
        cleanup_and_exit "Max session time reached (5min)"
    fi

    IDLE=$((CURRENT - LAST_ACTIVITY))
    if [ "$IDLE" -ge "$TIMEOUT" ]; then
        cleanup_and_exit "Idle timeout reached"
    fi
done

rm -rf "$STATE_FILE" "$MODPATH/nexus_secure"
exit 0