#!/system/bin/sh

MODPATH="${0%/*}"
. "$MODPATH"/utils.sh 2>>/cache/looper/looperbug.log || exit 1

loops=$(get_prop "loops")
timeout=$(get_prop "timeout")
disable_mode=$(get_prop "disable")
threshold=$(get_prop "threshold")
stability_time=$(get_prop "stability_time")
do_check_ss=$(get_prop "check_ss")
do_check_sf=$(get_prop "check_sf")
extra_stability=$(get_prop "extra_stability")
FOUND_BB=""
LOCKDIR="/dev/AshReXcue_service_lock"

[ -z "$timeout" ] && timeout=60
[ -z "$stability_time" ] && stability_time=80
[ -z "$extra_stability" ] && extra_stability="false"

set_log_file

# Define a lock directory in /dev (RAM) to prevent parallel execution
if mkdir "$LOCKDIR" 2>/dev/null; then
    log "Lock acquired: Main instance starting (PID=$$)"
else
    log "Duplicate instance detected (PID=$$). Exiting."
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
        log "Boot did NOT complete within ${timeout}s"
        log "Debug Info: loops=$loops, threshold=$threshold, disable_mode=$disable_mode"
        if [ "$disable_mode" = "partial" ]; then
            log "Lockdown triggered due to repeated incomplete boots"
            lockdown
            exit 0
        fi
        handle_boot_loop
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

if ! validate_tools; then
    log "CRITICAL: Tool validation failed"
    log "Triggering protection as stability cannot be confirmed"
    handle_boot_loop
    exit 1
fi

log "Tool validation passed. Using method: $CHECK_CMD"
log "Starting stability monitoring for ${stability_time}s"

consecutive_failures=0
failure_threshold=5
check_interval=3
stability_start=$(date +%s)
stability_end=$((stability_start + stability_time))
current_time=$stability_start
last_log_time=$current_time
log_interval=5

while [ "$current_time" -lt "$stability_end" ]; do
    if ! getprop sys.boot.reason >/dev/null 2>/dev/null; then
        log "CRITICAL: Cannot read system properties. Triggering protection."
        handle_boot_loop
        exit 1
    fi

    ss_status=0
    sf_status=0
    additional_checks_failed=0

    if [ "$do_check_ss" = "true" ]; then
        if ! check_process "system_server"; then
            ss_status=1
            log "CRITICAL: system_server process missing!"
        fi
    fi

    if [ "$do_check_sf" = "true" ]; then
        if ! check_process "surfaceflinger"; then
            sf_status=1
            log "CRITICAL: surfaceflinger process missing!"
        fi
    fi

    if [ "$extra_stability" = "true" ]; then
        for proc in servicemanager vold logd; do
            if ! check_process "$proc"; then
                additional_checks_failed=$((additional_checks_failed + 1))
                log "CRITICAL: $proc process missing!"
            fi
        done
    fi

    if [ $ss_status -eq 0 ] && [ $sf_status -eq 0 ] && [ $additional_checks_failed -eq 0 ]; then
        if [ $consecutive_failures -gt 0 ]; then
            log "Stability: Critical processes have recovered."
        fi
        consecutive_failures=0

        time_since_last_log=$((current_time - last_log_time))
        if [ $time_since_last_log -ge $log_interval ]; then
            elapsed_stability=$((current_time - stability_start))
            log "Stability check: ${elapsed_stability}s / ${stability_time}s - OK"
            last_log_time=$current_time
        fi
    else
        consecutive_failures=$((consecutive_failures + 1))
        log "Stability warning: Failure ${consecutive_failures}/${failure_threshold}"
    fi

    if [ $consecutive_failures -ge $failure_threshold ]; then
        log "CRITICAL: Failed ${failure_threshold} consecutive stability checks"
        log "Post-boot crash detected. Triggering protection."
        handle_boot_loop
        exit 1
    fi

    sleep $check_interval
    current_time=$(date +%s)
done

log "All stability checks passed. Device is stable."
log "Current loop value: $loops"

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
            log "ERROR: jq command failed with code $jq_exit_code"
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
                log "Failed to update module list"
            fi
        else
            log "No module changes detected - keeping existing module list"
            rm -f "$TMP_FILE"
            log "Temporary module list cleaned up"
        fi
    else
        log "No previous module list found. Creating new one."
        if mv -f "$TMP_FILE" "$MODULE_LIST"; then
            log "Module list created successfully"
        else
            log "Failed to create module list"
        fi
    fi
else
    log "WARNING: Temporary module file not found at $TMP_FILE"
fi

modify_prop "loops" "0"
modify_prop "disable" "none"
log "Reset loop counter and protection mode"

FOUND_BB=""
for bb in /data/adb/ksu/bin/busybox /data/adb/magisk/busybox /data/adb/ap/bin/busybox /system/bin/busybox; do
    if [ -x "$bb" ]; then
        FOUND_BB="$bb"
        break
    fi
done

if [ -n "$FOUND_BB" ]; then
    "$FOUND_BB" pkill -f "httpd -p 127.0.0.1:" >/dev/null 2>&1
    "$FOUND_BB" pkill -f "$MODPATH/monitor_" >/dev/null 2>&1
fi

rm -f "$MODPATH"/monitor_*.sh
rm -f "$MODPATH/.session_state"
rm -f "$MODPATH/webroot/nexus/uplink_key"
rm -f "$MODPATH/webroot/nexus/server_port"

log "WebUI cleanup: Stopped processes and removed stale files"
log "######## THE END ##########"
