#!/system/bin/sh

MODPATH="${0%/*}"
. "$MODPATH"/utils.sh || exit 1

set_log_file
sanitize_settings

loops=$(get_prop "loops")
real_loops=$loops
disable_mode=$(get_prop "disable")
real_disable=$disable_mode
timeout=$(get_prop "timeout")
threshold=$(get_prop "threshold")
stability_time=$(get_prop "stability_time")
extra_stability=$(get_prop "extra_stability")
LOCKDIR="/dev/ashrexcue_lock"

[ -z "$timeout" ] && timeout=60
in_range "$stability_time" "$STAB_MIN" "$STAB_MAX" || stability_time=$STAB_DEFAULT
[ -z "$extra_stability" ] && extra_stability="Off"

# Make sure only one instance of the service is running
if mkdir "$LOCKDIR" 2>/dev/null; then
    log "Lock acquired: Main instance starting (PID=$$)"
else
    log "Warning duplicate instance detected (PID=$$). Exiting."
    exit 0
fi

log "Executing Service.sh"
log "Checking if the device is completely booted..."

CHECK_CMD=""

validate_tools() {
    if command -v pgrep >/dev/null 2>&1; then
        test_val=$(pgrep -x init 2>/dev/null)
        if [ "$test_val" = "1" ]; then
            CHECK_CMD="pgrep_exact"
            return 0
        fi

        all_pids=$(pgrep init 2>/dev/null)
        set -- $all_pids
        if [ "$1" = "1" ]; then
            CHECK_CMD="pgrep_loose"
            return 0
        fi
    fi

    if command -v pidof >/dev/null 2>&1; then
        all_pids=$(pidof init 2>/dev/null)
        set -- $all_pids
        if [ "$1" = "1" ]; then
            CHECK_CMD="pidof"
            return 0
        fi
    fi

    CHECK_CMD="none"
    return 1
}


get_pid() {
    gp_min=
    for gp_p in $(pidof "$1" 2>/dev/null); do
        if [ -z "$gp_min" ] || [ "$gp_p" -lt "$gp_min" ]; then
            gp_min=$gp_p
        fi
    done
    printf '%s' "$gp_min"
}

clear_pids() {
    for cp_name in "$@"; do
        eval "last_pid_$cp_name=-"
        eval "grace_$cp_name=\$((current_time + 30))"
    done
}

start_time=$(date +%s)
boot_completed=""

while [ "$boot_completed" != "1" ]; do
    current_time=$(date +%s)
    elapsed=$((current_time - start_time))

    if [ "$elapsed" -ge "$timeout" ]; then
        log "Error boot did NOT complete within ${timeout}s"
        log "Debug Info: loops=$real_loops, threshold=$threshold, disable_mode=$real_disable"
        trigger_crash_reboot
    fi

    boot_completed=$(getprop sys.boot_completed)
    [ "$boot_completed" = "1" ] && break

    remainder=$((elapsed % 5))
    if [ "$remainder" -eq 0 ]; then
        log "Waiting for boot completion... (${elapsed}/${timeout}s)"
    fi
    sleep 1
done

end_time=$(date +%s)
elapsed=$((end_time - start_time))

log "Boot completed in ${elapsed}s"
modify_prop "loops" "0"
modify_prop "disable" "none"
log "Loop counter and disable mode reset early to prevent manual reboot penalties"

if ! validate_tools; then
    log "Error tool validation failed"
    trigger_crash_reboot
fi

log "Tool validation passed. Using method: $CHECK_CMD"
log "Starting SystemUI stability monitoring for ${stability_time}s"

consecutive_failures=0
failure_threshold=3
check_interval=3
restart_events=0
prop_failures=0
first_snapshot_done=0
stability_start=$(date +%s)
stability_end=$((stability_start + stability_time))
current_time=$stability_start
last_log_time=$current_time
log_interval=5

watch_list="surfaceflinger zygote64 zygote system_server com.android.systemui"
[ "$extra_stability" = "On" ] && watch_list="servicemanager vold $watch_list"
for w in $watch_list; do
    s=$(printf '%s' "$w" | tr '.' '_')
    eval "last_pid_$s="
    eval "cur_$s="
done

while [ "$current_time" -lt "$stability_end" ]; do
    if [ -z "$(pidof init 2>/dev/null)" ]; then
        sleep $check_interval
        current_time=$(date +%s)
        continue
    fi

    if ! getprop sys.boot.reason >/dev/null 2>/dev/null; then
        prop_failures=$((prop_failures + 1))
        log "Warning cannot read system properties (${prop_failures}/3)"
        if [ "$prop_failures" -ge 3 ]; then
            log "Error cannot read system properties for 3 consecutive checks, watchdog disabled for this boot"
            exit 0
        fi
        sleep $check_interval
        current_time=$(date +%s)
        continue
    fi
    prop_failures=0

    for w in $watch_list; do
        s=$(printf '%s' "$w" | tr '.' '_')
        pid=$(get_pid "$w")
        eval "cur_$s=\$pid"
    done

    if [ "$first_snapshot_done" != "1" ]; then
        snap=""
        for w in $watch_list; do
            s=$(printf '%s' "$w" | tr '.' '_')
            eval "c=\$cur_$s"
            [ -n "$c" ] && snap="$snap $w=$c"
        done
        if [ -n "$snap" ]; then
            log "Initial PIDs:$snap"
            first_snapshot_done=1
        fi
    fi

    changed=""
    missing=""
    for w in $watch_list; do
        s=$(printf '%s' "$w" | tr '.' '_')
        eval "cur=\$cur_$s"
        eval "prev=\$last_pid_$s"
        case "$prev" in
            "")
                [ -n "$cur" ] && eval "last_pid_$s=\$cur"
                continue
                ;;
            "-")
                if [ -n "$cur" ]; then
                    eval "last_pid_$s=\$cur"
                    log "Warning cascade child re-enrolled: $w ($cur)"
                else
                    eval "gu=\$grace_$s"
                    [ "$current_time" -ge "$gu" ] && missing="$missing $w"
                fi
                continue
                ;;
        esac
        if [ -z "$cur" ]; then
            missing="$missing $w"
            continue
        fi
        if [ "$cur" != "$prev" ]; then
            changed="$changed $w($prev->$cur)"
            eval "last_pid_$s=\$cur"
            case "$w" in
                servicemanager|surfaceflinger) clear_pids zygote64 zygote system_server com_android_systemui ;;
                zygote64|zygote) clear_pids system_server com_android_systemui ;;
                system_server) clear_pids com_android_systemui ;;
            esac
        fi
    done

    if [ -n "$changed" ]; then
        restart_events=$((restart_events + 1))
        consecutive_failures=0
        log "Warning restart detected:$changed (restart $restart_events/3, cascade baselines reset)"
        if [ "$restart_events" -ge 3 ]; then
            log "Error framework restart limit reached!"
            trigger_crash_reboot
            exit 0
        fi
    elif [ -n "$missing" ]; then
        consecutive_failures=$((consecutive_failures + 1))
        log "Warning missing:$missing (${consecutive_failures}/${failure_threshold})"
        if [ "$consecutive_failures" -ge "$failure_threshold" ]; then
            log "Error watched process missing for ${failure_threshold} consecutive checks!"
            trigger_crash_reboot
            exit 0
        fi
    else
        consecutive_failures=0
        if [ $((current_time - last_log_time)) -ge $log_interval ]; then
            log "Check: $((current_time - stability_start))s / ${stability_time}s - OK"
            last_log_time=$current_time
        fi
    fi

    sleep $check_interval
    current_time=$(date +%s)
done

log "SystemUI stability checks passed. Device is stable."
log "Current loop value: $real_loops"

new_timeout=$((elapsed + 15))
modify_prop "timeout" "$new_timeout"

log "Boot successful. Updated timeout to $new_timeout"

if [ -f "$TMP_FILE" ]; then
    log "Starting module comparison..."

    if [ -f "$MODULE_LIST" ] && ! check_bins jq; then
        log "Error missing binary: $MISSING_BIN. Skipping module comparison."
        rm -f "$TMP_FILE"
    elif [ -f "$MODULE_LIST" ]; then
        log "Binary OK: $FOUND_BINS"
        log "Previous module list found. Comparing..."

        jq_output=$("$JQ" -n -r --slurpfile new "$TMP_FILE" --slurpfile old "$MODULE_LIST" '
          ($old[0] | map({key: .id, value: .}) | from_entries) as $oldmap |
          ($new[0] | map({key: .id, value: .}) | from_entries) as $newmap |
          ($newmap | to_entries[] | .key as $key | .value as $n |
          ($oldmap[$key] // null) as $o |
          if $o == null then
            "Added: \($n.name) (\($n.id)) version:\($n.version) (\($n.status))"
          elif $n.version != $o.version or $n.versionCode != $o.versionCode or $n.name != $o.name then
            "Updated: \($n.name) (\($n.id)) version:\($o.version)->\($n.version) \($o.status)->\($n.status)"
          elif $n.status != $o.status then
            "Status: \($n.name) (\($n.id)) \($o.status)->\($n.status)"
          elif $n.size != $o.size then
            "Size Changed: \($n.name) (\($n.id)) size:\($o.size)->\($n.size) (\($n.status))"
          else
            empty
          end),
          ($oldmap | to_entries[] | .key as $key | .value as $o |
          ($newmap[$key] // null) as $n |
          if $n == null then
            "Removed: \($o.name) (\($o.id)) version:\($o.version) (\($o.status))"
          else
            empty
          end)
        ' 2>&1)

        jq_exit_code=$?

        if [ $jq_exit_code -ne 0 ]; then
            log "Error jq command failed with code $jq_exit_code"
            log "Output: $jq_output"
        else
            log "jq command executed successfully"
            changed_modules="$jq_output"
        fi

        if [ -n "$changed_modules" ]; then
            log "Module changes detected:"
            printf '%s\n' "$changed_modules" | while IFS= read -r change; do
                log "$change"
            done
            log "Updating module version history due to detected changes."
            if mv -f "$TMP_FILE" "$MODULE_LIST"; then
                log "Module list updated successfully"
            else
                log "Error failed to update module list"
            fi
        else
            log "No module changes detected"
            rm -f "$TMP_FILE"
        fi
    else
        log "No previous module list found. Creating new one."
        if mv -f "$TMP_FILE" "$MODULE_LIST"; then
            log "Module list created successfully"
        else
            log "Error failed to create module list"
        fi
    fi
else
    log "Warning temporary module file not found at $TMP_FILE"
fi

log "Reset protection mode loop counter and disable were reset at boot"

current_whitelist=$(get_prop "whitelist")
if [ -n "$current_whitelist" ]; then
    clean_wl=$(printf '%s' "$current_whitelist" | tr -d '"' | tr -d "'" | tr -d ' ')
    new_wl=""
    removed_any=0

    for mod in $(printf '%s' "$clean_wl" | tr ',' ' '); do
        if [ -n "$mod" ]; then
            if [ -d "/data/adb/modules/$mod" ]; then
                if [ -z "$new_wl" ]; then
                    new_wl="$mod"
                else
                    new_wl="${new_wl},${mod}"
                fi
            else
                log "Whitelist cleanup: '$mod' is missing. Removing."
                removed_any=1
            fi
        fi
    done

    if [ "$removed_any" -eq 1 ]; then
        modify_prop -s "whitelist" "\"$new_wl\""
        log "Whitelist pruned: removed uninstalled modules."
    fi
fi

FOUND_BB=$(find_busybox)
if [ -n "$FOUND_BB" ]; then
    if [ -f "$MODPATH/nexus_secure/server_port" ]; then
        PORT=$(cat "$MODPATH/nexus_secure/server_port")
        "$FOUND_BB" pkill -f "httpd -p 127.0.0.1:$PORT" >/dev/null 2>&1
    fi
    "$FOUND_BB" pkill -f "$MODPATH/monitor.sh" >/dev/null 2>&1
fi

rm -f "$MODPATH"/monitor_*.sh
rm -f "$MODPATH/.session_state"
rm -f "$MODPATH/.session_warn"
rm -rf "$MODPATH/nexus_secure"

log "WebUI cleanup: Stopped processes and removed stale files"

modify_prop -s "rs" "" "$MODPATH/module.prop"

write_description

modify_prop -s "boot" "booted" "$MODPATH/settings.prop"
save_boot_marker
log "######## THE END ##########"