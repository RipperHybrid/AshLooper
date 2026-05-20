#!/system/bin/sh

MODPATH="${0%/*}"
. "$MODPATH"/utils.sh 2>>/cache/looper/looperbug.log || exit 1

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
[ -z "$stability_time" ] && stability_time=80
[ -z "$extra_stability" ] && extra_stability="false"

set_log_file

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

check_process() {
    proc_name=$1
    case "$CHECK_CMD" in
        "pgrep_exact")
            pgrep -x "$proc_name" >/dev/null 2>&1
            return $?
            ;;
        "pgrep_loose")
            all_pids=$(pgrep "$proc_name" 2>/dev/null)
            if [ -n "$all_pids" ]; then return 0; else return 1; fi
            ;;
        "pidof")
            pidof "$proc_name" >/dev/null 2>&1
            return $?
            ;;
        *)
            return 1
            ;;
    esac
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
stability_start=$(date +%s)
stability_end=$((stability_start + stability_time))
current_time=$stability_start
last_log_time=$current_time
log_interval=5

sysui_last_pid=""
sysui_crash_count=0

while [ "$current_time" -lt "$stability_end" ]; do
    if ! getprop sys.boot.reason >/dev/null 2>/dev/null; then
        log "Error cannot read system properties."
        trigger_crash_reboot
    fi

    sysui_status=0
    additional_checks_failed=0

    current_sysui_pid=$(pidof com.android.systemui 2>/dev/null || pgrep -f com.android.systemui 2>/dev/null)
    set -- $current_sysui_pid
    current_sysui_pid=$1

    if [ -z "$current_sysui_pid" ]; then
        sysui_status=1
        log "Warning com.android.systemui process missing!"
    else
        if [ -n "$sysui_last_pid" ] && [ "$current_sysui_pid" != "$sysui_last_pid" ]; then
            sysui_crash_count=$((sysui_crash_count + 1))
            log "Warning com.android.systemui crashed and restarted. Crash count: $sysui_crash_count"
            if [ "$sysui_crash_count" -ge 3 ]; then
                log "Error com.android.systemui is crash-looping!"
                trigger_crash_reboot
            fi
        fi
        sysui_last_pid="$current_sysui_pid"
    fi

    if [ "$extra_stability" = "true" ]; then
        for proc in servicemanager vold logd; do
            if ! check_process "$proc"; then
                additional_checks_failed=$((additional_checks_failed + 1))
                log "Error $proc daemon missing!"
            fi
        done
    fi

    if [ $sysui_status -eq 0 ] && [ $additional_checks_failed -eq 0 ]; then
        if [ $consecutive_failures -gt 0 ]; then
            log "SystemUI has recovered."
        fi
        consecutive_failures=0

        time_since_last_log=$((current_time - last_log_time))
        if [ $time_since_last_log -ge $log_interval ]; then
            elapsed_stability=$((current_time - stability_start))
            log "Check: ${elapsed_stability}s / ${stability_time}s - OK"
            last_log_time=$current_time
        fi
    else
        consecutive_failures=$((consecutive_failures + 1))
        log "Warning SystemUI missing ${consecutive_failures}/${failure_threshold}"
    fi

    if [ $consecutive_failures -ge $failure_threshold ]; then
        log "Error SystemUI missing for ${failure_threshold} consecutive checks!"
        trigger_crash_reboot
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

    if [ -f "$MODULE_LIST" ]; then
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
rm -f "$MODPATH/nexus_secure"

log "WebUI cleanup: Stopped processes and removed stale files"
log "######## THE END ##########"
modify_prop -s "boot" "booted" "$MODPATH/settings.prop"