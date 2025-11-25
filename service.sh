#!/system/bin/sh
# AshReXcue service Logic - Don't modify anything after this - By AshBorn (@Ripper_Hybrid)

MODPATH="${0%/*}"
. "$MODPATH/func.sh" || { logger "Error: Failed to source func.sh"; exit 1; }

loops=$(get_prop "loops")
timeout=$(get_prop "timeout")
disable_mode=$(get_prop "disable")
threshold=$(get_prop "threshold")
stability_time=$(get_prop "stability_time")

[ -z "$timeout" ] && timeout=60
[ -z "$stability_time" ] && stability_time=80

set_log_file
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

while [ "$boot_completed" != "1" ]; do
    current_time=$(date +%s)
    elapsed=$((current_time - start_time))
    
    if [ "$elapsed" -ge "$timeout" ]; then
        log "Boot did NOT complete within $timeout seconds."
        log "Debug Info: loops=$loops, threshold=$threshold, disable_mode=$disable_mode"
        if [ "$disable_mode" = "partial" ]; then
            log "Lockdown triggered due to repeated incomplete boots."
            lockdown
            exit 0
        fi
        handle_boot_loop
    fi
    
    boot_completed=$(getprop sys.boot_completed)
    [ "$boot_completed" = "1" ] && break
    log "Device is not completely booted yet. Waiting... ($elapsed/$timeout)"
    sleep 1
done

end_time=$(date +%s)
elapsed=$((end_time - start_time))

log "Device is completely booted."
log "Boot completed in ${elapsed}s"

if ! validate_tools; then
    log "CRITICAL: Tool validation failed. Cannot verify system stability."
    log "Triggering protection as a precaution, as stability cannot be confirmed."
    modify_prop "+" "loops"
    handle_boot_loop
    exit 1
else
    log "Tool validation passed. Using method: $CHECK_CMD"
fi

log "Starting post-boot stability monitoring for ${stability_time}s..."

stability_start=$(date +%s)
stability_end=$((stability_start + stability_time))
current_time=$stability_start
check_interval=3
consecutive_failures=0
failure_threshold=5

while [ "$current_time" -lt "$stability_end" ]; do
    if ! getprop sys.boot.reason >/dev/null 2>/dev/null; then
        log "CRITICAL: Cannot read system properties. Triggering protection."
        modify_prop "+" "loops"
        handle_boot_loop
        exit 1
    fi

    log "Stability Check: Running checks..."

    check_process "system_server"
    ss_status=$?
    
    check_process "surfaceflinger"
    sf_status=$?

    if [ $ss_status -eq 0 ] && [ $sf_status -eq 0 ]; then
        if [ $consecutive_failures -gt 0 ]; then
            log "Stability: Critical processes have recovered."
        fi
        consecutive_failures=0
    else
        consecutive_failures=$((consecutive_failures + 1))
        log "Stability WARNING: Failure $consecutive_failures/$failure_threshold"
        
        if [ $ss_status -ne 0 ]; then
            log "system_server check FAILED."
        else
            log "system_server check PASSED."
        fi
        
        if [ $sf_status -ne 0 ]; then
            log "surfaceflinger check FAILED."
        else
            log "surfaceflinger check PASSED."
        fi
    fi

    if [ $consecutive_failures -ge $failure_threshold ]; then
        log "CRITICAL: Critical processes failed $failure_threshold consecutive checks."
        log "Post-boot crash detected. Triggering protection."
        modify_prop "+" "loops"
        handle_boot_loop
        exit 1
    fi
    
    sleep $check_interval
    current_time=$(date +%s)
    elapsed_stability=$((current_time - stability_start))
    
    if [ $consecutive_failures -eq 0 ]; then
        log "Stability check passed (${elapsed_stability}s / ${stability_time}s)"
    fi
done

log "All stability checks passed. Device is stable."
log "Checking the current loop value ($loops)"

new_timeout=$((elapsed + 15))
modify_prop "timeout" "$new_timeout"

log "Boot was successful. Updated timeout to $new_timeout"

if [ -f "$TMP_FILE" ]; then
    log "Starting module comparison process..."
    
    if [ -f "$MODULE_LIST" ]; then
        log "Previous module list found. Comparing modules..."
        
        jq_output=$("$JQ" -n --slurpfile new "$TMP_FILE" --slurpfile old "$MODULE_LIST" '
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
            log "ERROR: jq command failed with exit code $jq_exit_code"
            log "jq output: $jq_output"
        else
            log "jq command executed successfully"
            changed_modules="$jq_output"
        fi
        
        if [ -n "$changed_modules" ]; then
            log "Module changes detected:"
            printf '%s\n' "$changed_modules" | while IFS= read -r change; do
                log "  $change"
            done
            log "Updating module version history due to detected changes."
            if mv -f "$TMP_FILE" "$MODULE_LIST"; then
                log "Module version history updated successfully"
            else
                log "Failed to update module version history"
            fi
        else
            log "No module changes detected - keeping existing module list"
            rm -f "$TMP_FILE"
            log "Temporary module list cleaned up"
        fi
    else
        log "No previous module list found. Creating new one."
        if mv -f "$TMP_FILE" "$MODULE_LIST"; then
            log "Module version history created successfully"
        else
            log "Failed to create module version history"
        fi
    fi
else
    log "WARNING: Temporary module file not found at $TMP_FILE"
fi

modify_prop "loops" "0"
modify_prop "disable" "none"
log "Resetting loop counter and protection mode."
log "######## THE END ##########"