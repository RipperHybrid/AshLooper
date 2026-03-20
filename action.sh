#!/system/bin/sh
MODPATH="${0%/*}"
. "$MODPATH/utils.sh" || { echo "- Error: Failed to source utils.sh"; exit 1; }

SESSION_TIMEOUT=300
MAX_IDLE_TIME=120
ACTIVITY_CHECK_INTERVAL=30
STATE_FILE="$MODPATH/.session_state"

VSKL() {
  # Original idea by chainfire and ianmacd @xda-developers
  # Modified by AshBorn (@Ripper_Hybrid) to add touch support
  [ "$1" ] && local delay=$1 || local delay=10
  local attempts=0
  while [ $attempts -lt 3 ]; do
    local count=0
    while true; do
      EVENT_LINE=$(timeout "$delay" /system/bin/getevent -lqc 1 2>&1)
      count=$((count + 1))
      echo "$EVENT_LINE" | grep -q 'ABS_MT_TRACKING_ID' && { sleep 0.2; return 0; }
      echo "$EVENT_LINE" | grep -q 'KEY_VOLUMEUP *DOWN' && { sleep 0.2; return 1; }
      echo "$EVENT_LINE" | grep -q 'KEY_VOLUMEDOWN *DOWN' && { sleep 0.2; return 2; }
      [ $count -gt 9 ] && break
      sleep 0.2
    done
    attempts=$((attempts + 1))
    echo "- Input not detected. Try again ($attempts/3)"
    echo " "
  done
  echo "- Input not detected after 3 attempts. Aborting."
  exit
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
    rm -rf "\$STATE_FILE" "\$SELF_SCRIPT" "\$MODPATH/nexus_secure" "\$MODPATH"/monitor_*.sh
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

    RANDOM_PORT=$(generate_random_port)
    echo "- Generated port: $RANDOM_PORT"
    "$FOUND_BB" pkill -f "httpd -p 127.0.0.1:"
    "$FOUND_BB" pkill -f "$MODPATH/monitor_"
    rm -rf "$MODPATH"/monitor_*.sh "$STATE_FILE" "$MODPATH/nexus_secure"

    TOKEN=$(generate_secure_token)
    [ -z "$TOKEN" ] && { echo "- Error: Token generation failed"; return 1; }

    mkdir -p "$MODPATH/nexus_secure"
    echo "$TOKEN" > "$MODPATH/nexus_secure/uplink_key"
    echo "$RANDOM_PORT" > "$MODPATH/nexus_secure/server_port"
    chmod 700 "$MODPATH/nexus_secure"
    chmod 600 "$MODPATH/nexus_secure/uplink_key"
    chmod 644 "$MODPATH/nexus_secure/server_port"

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
        MONITOR_SCRIPT=$(create_monitor_script "$RANDOM_PORT" "$MAX_IDLE_TIME")
        su -c "sh $MODPATH/$MONITOR_SCRIPT >/dev/null 2>&1 &"
        (
            for i in 1 2 3; do
                su 2000 -c "cmd notification post -t 'AshReXcue' 'Server Started' 'AshReXcue WebUI Localhost Started | Idle: $((MAX_IDLE_TIME/60))min'" >/dev/null 2>&1 && break
                sleep 1
            done
        ) &
        LAUNCH_PORT=$RANDOM_PORT
        LAUNCH_TOKEN=$TOKEN
        return 0
    else
        echo "- Error: Server failed to start"
        rm -rf "$MODPATH/nexus_secure" "$STATE_FILE"
        return 1
    fi
}

echo ""
echo "=============================="
echo "       AshReXcue Menu"
echo "=============================="
echo " 1. Open WebUI"
echo " 2. Add to Whitelist"
echo " 3. Remove from Whitelist"
echo " 4. Exit"
echo "=============================="
echo "> Vol+ Select | Touch Next | Vol- Prev"
echo ""

opt=1
while true; do
    case "$opt" in
        1) opt_name="Open WebUI" ;;
        2) opt_name="Add to Whitelist" ;;
        3) opt_name="Remove from Whitelist" ;;
        4) opt_name="Exit" ;;
    esac

    echo "-> [ $opt ] $opt_name"
    VSKL
    key=$?

    if [ "$key" -eq 1 ]; then
        selected_option=$opt
        break
    elif [ "$key" -eq 0 ]; then
        opt=$((opt % 4 + 1))
    elif [ "$key" -eq 2 ]; then
        opt=$((opt - 1))
        [ "$opt" -lt 1 ] && opt=4
    fi
done

if [ "$selected_option" -eq 1 ]; then
    echo ""
    echo "=============================="
    echo "       Starting WebUI"
    echo "=============================="
    echo ""
    if start_server; then
        echo "- Opening browser in 3s..."
        sleep 2
        echo "- Localhost set: http://127.0.0.1:$LAUNCH_PORT"
        echo "- Redirecting to browser..."
        sleep 1
        am start -a android.intent.action.VIEW -d "http://127.0.0.1:$LAUNCH_PORT/#$LAUNCH_TOKEN" >/dev/null 2>&1
        echo ""
    else
        echo "- Server start failed"
    fi

elif [ "$selected_option" -eq 2 ]; then
    TMP_LIST="$TMPDIR/ash_mod_list.txt"
    > "$TMP_LIST"
    count=0

    whitelist=$(get_prop "whitelist" | tr -d " '\"\r\n")

    for mod_dir in /data/adb/modules/*; do
        [ -d "$mod_dir" ] || continue
        folder_name=${mod_dir##*/}
        [ "$folder_name" = "AshLooper" ] && continue

        id="$folder_name"
        name="$folder_name"
        if [ -f "$mod_dir/module.prop" ]; then
            prop_id=$(get_prop "id" "$mod_dir/module.prop")
            prop_name=$(get_prop "name" "$mod_dir/module.prop")
            [ -n "$prop_id" ] && id=$(printf '%s' "$prop_id" | tr -d " '\"\r\n")
            [ -n "$prop_name" ] && name="$prop_name"
        fi

        is_whitelisted=0
        case ",$whitelist," in
            *",${id},"* | *",${folder_name},"* ) is_whitelisted=1 ;;
        esac

        if [ "$is_whitelisted" -eq 0 ]; then
            count=$((count + 1))
            echo "$count|$id|$name" >> "$TMP_LIST"
        fi
    done

    if [ "$count" -eq 0 ]; then
        echo ""
        echo "- All modules are already whitelisted."
    else
        total_opts=$((count + 1))
        echo ""
        echo "=============================="
        echo "      Add to Whitelist"
        echo "> Vol+ Select | Touch Next | Vol- Prev"
        echo "=============================="
        while IFS='|' read -r idx m_id m_name; do
            echo " $idx. $m_name ($m_id)"
        done < "$TMP_LIST"
        echo " $total_opts. DONE"
        echo "=============================="

        current=1
        pending_adds=""

        while true; do
            if [ "$current" -eq "$total_opts" ]; then
                name_display="DONE"
            else
                name_display=$(grep "^${current}|" "$TMP_LIST" | cut -d'|' -f3)
                id_val=$(grep "^${current}|" "$TMP_LIST" | cut -d'|' -f2)
            fi

            echo "-> [ $current ] $name_display"
            VSKL
            key=$?

            if [ "$key" -eq 1 ]; then
                if [ "$current" -eq "$total_opts" ]; then
                    break
                else
                    case ",$pending_adds," in
                        *",${id_val},"* )
                            echo "   [ Already marked for adding ]"
                            ;;
                        *)
                            pending_adds="$pending_adds,$id_val"
                            echo "   *** Marked to add: $name_display ***"
                            ;;
                    esac
                    current=$((current % total_opts + 1))
                fi
            elif [ "$key" -eq 0 ]; then
                current=$((current % total_opts + 1))
            elif [ "$key" -eq 2 ]; then
                current=$((current - 1))
                [ "$current" -lt 1 ] && current=$total_opts
            fi
        done

        if [ -n "$pending_adds" ]; then
            pending_adds=$(echo "$pending_adds" | sed 's/^,//')
            whitelist="$whitelist,$pending_adds"
            modify_prop -s "whitelist" "\"$whitelist\""
            echo ""
            echo "- Updated whitelist: $whitelist"
        else
            echo ""
            echo "- No new modules added."
        fi
    fi
    rm -f "$TMP_LIST"

elif [ "$selected_option" -eq 3 ]; then
    whitelist=$(get_prop "whitelist" | tr -d " '\"\r\n")

    if [ "$whitelist" = "AshLooper" ] || [ -z "$whitelist" ]; then
        echo ""
        echo "- Whitelist only contains AshLooper. Nothing to remove."
        exit 0
    fi

    TMP_LIST="$TMPDIR/ash_mod_list.txt"
    > "$TMP_LIST"
    count=0

    IFS=','
    set -- $whitelist
    unset IFS

    for id in "$@"; do
        [ "$id" = "AshLooper" ] && continue
        [ -z "$id" ] && continue
        count=$((count + 1))
        echo "$count|$id" >> "$TMP_LIST"
    done

    if [ "$count" -eq 0 ]; then
        echo ""
        echo "- No modules to remove (AshLooper cannot be removed)."
    else
        total_opts=$((count + 1))
        echo ""
        echo "=============================="
        echo "   Remove from Whitelist"
        echo "> Vol+ Select | Touch Next | Vol- Prev"
        echo "=============================="
        while IFS='|' read -r idx m_id; do
            echo " $idx. $m_id"
        done < "$TMP_LIST"
        echo " $total_opts. DONE"
        echo "=============================="

        current=1
        pending_removes=""

        while true; do
            if [ "$current" -eq "$total_opts" ]; then
                name_display="DONE"
            else
                name_display=$(grep "^${current}|" "$TMP_LIST" | cut -d'|' -f2)
                id_val="$name_display"
            fi

            echo "-> [ $current ] $name_display"
            VSKL
            key=$?

            if [ "$key" -eq 1 ]; then
                if [ "$current" -eq "$total_opts" ]; then
                    break
                else
                    case ",$pending_removes," in
                        *",${id_val},"* )
                            echo "   [ Already marked for removal ]"
                            ;;
                        *)
                            pending_removes="$pending_removes,$id_val"
                            echo "   *** Marked to remove: $name_display ***"
                            ;;
                    esac
                    current=$((current % total_opts + 1))
                fi
            elif [ "$key" -eq 0 ]; then
                current=$((current % total_opts + 1))
            elif [ "$key" -eq 2 ]; then
                current=$((current - 1))
                [ "$current" -lt 1 ] && current=$total_opts
            fi
        done

        if [ -n "$pending_removes" ]; then
            new_whitelist="AshLooper"
            IFS=','
            set -- $whitelist
            unset IFS

            for orig_id in "$@"; do
                [ "$orig_id" = "AshLooper" ] && continue
                [ -z "$orig_id" ] && continue

                is_removed=0
                case ",$pending_removes," in
                    *",${orig_id},"* ) is_removed=1 ;;
                esac

                if [ "$is_removed" -eq 0 ]; then
                    new_whitelist="$new_whitelist,$orig_id"
                fi
            done

            modify_prop -s "whitelist" "\"$new_whitelist\""
            echo ""
            echo "- Updated whitelist: $new_whitelist"
        else
            echo ""
            echo "- No modules removed."
        fi
    fi
    rm -f "$TMP_LIST"

elif [ "$selected_option" -eq 4 ]; then
    echo ""
    echo "Exiting AshReXcue Menu..."
    exit 0
fi