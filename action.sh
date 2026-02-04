#!/system/bin/sh
MODPATH="${0%/*}"
. "$MODPATH/utils.sh" || { echo "- Error: Failed to source utils.sh"; exit 1; }

SESSION_TIMEOUT=300
MAX_IDLE_TIME=60
ACTIVITY_CHECK_INTERVAL=30
STATE_FILE="$MODPATH/.session_state"

chooseport() {
  [ "$1" ] && local delay=$1 || local delay=10
  local error=false
  if [ -z "$TMPDIR" ]; then TMPDIR="/data/local/tmp"; fi
  mkdir -p "$TMPDIR"
  while true; do
    local count=0
    while true; do
      timeout $delay /system/bin/getevent -lqc 1 2>&1 > $TMPDIR/events &
      sleep 0.5; count=$((count + 1))
      if (`grep -q 'KEY_VOLUMEUP *DOWN' $TMPDIR/events`); then
        return 0
      elif (`grep -q 'KEY_VOLUMEDOWN *DOWN' $TMPDIR/events`); then
        return 1
      fi
      [ $count -gt 12 ] && break
    done
    if $error; then
      echo "- Volume key not detected. Aborting"
      exit
    else
      error=true
      echo "- Volume key not detected. Try again"
    fi
  done
}

find_busybox() {
    for candidate in /data/adb/ksu/bin/busybox /data/adb/magisk/busybox /data/adb/ap/bin/busybox /system/bin/busybox; do
        if [ -f "$candidate" ] && [ -x "$candidate" ]; then
            if "$candidate" true >/dev/null 2>&1; then
                echo "$candidate"
                return 0
            fi
        fi
    done

    if command -v busybox >/dev/null 2>&1; then
        sys_bb=$(command -v busybox)
        if "$sys_bb" true >/dev/null 2>&1; then
            echo "$sys_bb"
            return 0
        fi
    fi
    return 1
}

generate_random_port() {
    if [ -c "/dev/urandom" ]; then
        PORT=$(od -An -N2 -tu2 /dev/urandom | tr -d ' ')
        PORT=$((6000 + (PORT % 4000)))
    else
        PORT=$((6000 + ($(date +%s) % 4000)))
    fi
    echo "$PORT"
}

generate_secure_token() {
    local token=""
    if [ -f "/proc/sys/kernel/random/uuid" ]; then
        token=$(cat /proc/sys/kernel/random/uuid)
    elif [ -c "/dev/urandom" ]; then
        token=$(dd if=/dev/urandom bs=16 count=1 2>/dev/null | od -An -tx1 | tr -d ' \n')
    else
        token=$(cat /proc/uptime /proc/loadavg /proc/stat 2>/dev/null | md5sum | cut -d' ' -f1)-$(date +%s%N)
    fi
    echo "$token"
}

create_monitor_script() {
    local PORT=$1
    local TIMEOUT=$2
    local MONITOR_NAME="monitor_${PORT}_$(date +%s).sh"

    cat > "$MODPATH/$MONITOR_NAME" << MONITOR_EOF
#!/system/bin/sh
MODPATH="\${0%/*}"
STATE_FILE="\$MODPATH/.session_state"
SELF_SCRIPT="\$MODPATH/$MONITOR_NAME"

find_busybox() {
    for candidate in /data/adb/ksu/bin/busybox /data/adb/magisk/busybox /data/adb/ap/bin/busybox /system/bin/busybox; do
        if [ -f "\$candidate" ] && [ -x "\$candidate" ]; then
            if "\$candidate" true >/dev/null 2>&1; then
                echo "\$candidate"
                return 0
            fi
        fi
    done
    return 1
}

send_notification() {
    for i in 1 2 3; do
        su 2000 -c "cmd notification post -t 'AshReXcue' '\$1' '\$2'" >/dev/null 2>&1 && break
        sleep 1
    done
}

cleanup_and_exit() {
    BB=\$(find_busybox)
    [ -n "\$BB" ] && "\$BB" pkill -f "httpd -p 127.0.0.1:$PORT"

    send_notification "WebUI Stopped" "\$1"

    rm -f "\$STATE_FILE" "\$SELF_SCRIPT"
    rm -f "\$MODPATH/webroot/nexus/uplink_key" "\$MODPATH/webroot/nexus/server_port"
    rm -f "\$MODPATH"/monitor_*.sh

    exit 0
}

BB=\$(find_busybox)
[ -z "\$BB" ] && cleanup_and_exit "Error: Busybox not found"

while [ -f "\$STATE_FILE" ]; do
    sleep 30

    read PORT DEADLINE LAST_ACTIVITY < "\$STATE_FILE"
    CURRENT=\$(\$BB date +%s)

    [ "\$CURRENT" -ge "\$DEADLINE" ] && cleanup_and_exit "Killed WebUI reached max session time (5min)"

    IDLE=\$((CURRENT - LAST_ACTIVITY))

    [ "\$IDLE" -ge $TIMEOUT ] && cleanup_and_exit "Killed WebUI reached Idle timeout ($((TIMEOUT/60)) min)"

    REMAINING=\$((DEADLINE - CURRENT))
    [ "\$REMAINING" -le 0 ] && cleanup_and_exit "Session timeout"
done

cleanup_and_exit "Session ended"
MONITOR_EOF

    chmod +x "$MODPATH/$MONITOR_NAME"
    echo "$MONITOR_NAME"
}

start_server() {
    FOUND_BB=$(find_busybox)
    [ -z "$FOUND_BB" ] && { echo "- Error: Busybox not found"; return 1; }

    echo "- Found Busybox: $FOUND_BB"

    RANDOM_PORT=$(generate_random_port)
    echo "- Generated port: $RANDOM_PORT"

    "$FOUND_BB" pkill -f "httpd -p 127.0.0.1:"
    "$FOUND_BB" pkill -f "$MODPATH/monitor_"

    rm -f "$MODPATH"/monitor_*.sh "$STATE_FILE"

    TOKEN=$(generate_secure_token)
    [ -z "$TOKEN" ] && { echo "- Error: Token generation failed"; return 1; }

    mkdir -p "$MODPATH/webroot/nexus"
    echo "$TOKEN" > "$MODPATH/webroot/nexus/uplink_key"
    echo "$RANDOM_PORT" > "$MODPATH/webroot/nexus/server_port"
    chmod 700 "$MODPATH/webroot/nexus"
    chmod 600 "$MODPATH/webroot/nexus/uplink_key"
    chmod 644 "$MODPATH/webroot/nexus/server_port"

    CURRENT_TIME=$(date +%s)
    DEADLINE=$((CURRENT_TIME + SESSION_TIMEOUT))
    echo "$RANDOM_PORT $DEADLINE $CURRENT_TIME" > "$STATE_FILE"

    [ -f "$MODPATH/webroot/cgi-bin/exec" ] && chmod +x "$MODPATH/webroot/cgi-bin/exec"

    BB_DIR=$("$FOUND_BB" dirname "$FOUND_BB")
    export PATH="$BB_DIR:$PATH"

    echo "- Starting server on port $RANDOM_PORT..."
    "$FOUND_BB" httpd -p 127.0.0.1:$RANDOM_PORT -h "$MODPATH/webroot" >/dev/null 2>&1

    sleep 1
    SERVER_PID=$("$FOUND_BB" pgrep -f "httpd -p 127.0.0.1:$RANDOM_PORT")

    if [ -n "$SERVER_PID" ]; then
        echo "- Server started (PID: $SERVER_PID)"

        MONITOR_SCRIPT=$(create_monitor_script "$RANDOM_PORT" "$MAX_IDLE_TIME")
        su -c "sh $MODPATH/$MONITOR_SCRIPT >/dev/null 2>&1 &"

        echo "- Monitor: $MONITOR_SCRIPT"
        echo "- Auto-shutdown: $((SESSION_TIMEOUT/60))min max / $((MAX_IDLE_TIME/60))min idle"

        (
            for i in 1 2 3; do
                su 2000 -c "cmd notification post -t 'AshReXcue' 'Server Started' 'AshReXcue WebUI Localhost Started | Idle: $((MAX_IDLE_TIME/60))min'" >/dev/null 2>&1 && break
                sleep 1
            done
        ) &

        LAUNCH_PORT=$RANDOM_PORT
        return 0
    else
        echo "- Error: Server failed to start"
        rm -f "$MODPATH/webroot/nexus/uplink_key" "$MODPATH/webroot/nexus/server_port" "$STATE_FILE"
        return 1
    fi
}

echo ""
echo "=============================="
echo "      AshReXcue WebUI"
echo "=============================="
echo ""
echo "- Open WebUI?"
echo "- Vol+ = Yes   Vol- = No"
echo ""

if chooseport; then
    echo " > Yes"
    echo ""

    if start_server; then
        echo "- Opening browser in 3s..."
        sleep 2
        echo "- Localhost set: http://127.0.0.1:$LAUNCH_PORT"
        echo "- Security: localhost-only, random port, unique token"
        echo "- Redirecting to browser..."
        sleep 1
        am start -a android.intent.action.VIEW -d "http://127.0.0.1:$LAUNCH_PORT" >/dev/null 2>&1
        echo ""
    else
        echo "- Server start failed"
    fi
else
    echo "- Cancelled"
fi