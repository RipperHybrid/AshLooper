#!/bin/bash

# Define paths
MODULE_PROP="/data/adb/modules/AshLooper/module.prop"
MODULES_DIR="/data/adb/modules"
REBOOT_RECOVERY_CMD="reboot recovery"
LOG_FILE="/cache/AshLooper.log"
PREVIOUS_LOG_FILE="${LOG_FILE/.log/-Previous-Boot.log}"

log() {
    echo "$(date): $1" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
}

start_run() {
    if [ -f "$LOG_FILE" ]; then
        mv "$LOG_FILE" "$PREVIOUS_LOG_FILE"
    fi
}

threshold=3

update_loops_property() {
    log "Entering update loops property function"
    
    loops=$(grep "loops=" "$MODULE_PROP" | cut -d '=' -f 2)

    if [ -z "$loops" ]; then
        loops=0
    fi

    loops=$((loops + 1))
    log "Increment the value of loops"

    sed -i "s/loops=.*/loops=$loops/" "$MODULE_PROP" || log "Failed to update loops property"
    log "Updating The Module Prop With New Loop Value"
}

handle_ksu() {
      log "KernelSU detected. Mounting modules..."
      mount -t auto -o loop /data/adb/ksu/modules.img /data/adb/modules
      sleep 1
      loops=$(grep "loops=" "$MODULE_PROP" | cut -d '=' -f 2)
      log "Reading the current loop value ($loops)"
    if [ "$loops" -ge "$threshold" ]; then
        log "Threshold Limit Reached."
        sed -i "s/loops=.*/loops=0/" "$MODULE_PROP"
        log "Resetting The Loop Value"
    
    log "Disabling modules..."
    for module_dir in "$MODULES_DIR"/*; do
        if [ "$module_dir" != "$MODULES_DIR/AshLooper" ] && [ -d "$module_dir" ]; then
            log "Disabling: $module_dir"
            touch "$module_dir/disable"
        fi
    done
    
    log "Triggering recovery mode..."
    $REBOOT_RECOVERY_CMD
    fi
}

handle_magisk() {
    log "Magisk detected. Checking for boot loops..."
    loops=$(grep "loops=" "$MODULE_PROP" | cut -d '=' -f 2)
    log "Reading the current loop value ($loops)"
    if [ "$loops" -ge "$threshold" ]; then
        log "Threshold Limit Reached."
        sed -i "s/loops=.*/loops=0/" "$MODULE_PROP"
        log "Resetting The Loop Value"
        
        log "Disabling modules..."
        for module_dir in "$MODULES_DIR"/*; do
            if [ "$module_dir" != "$MODULES_DIR/AshLooper" ] && [ -d "$module_dir" ]; then
                log "Disabling: $module_dir"
                touch "$module_dir/disable"
            fi
        done
        
        log "Triggering recovery mode..."
        $REBOOT_RECOVERY_CMD
        fi
}

main() {
    start_run
    log "Executing post-fs-data.sh"
    
    if [ -f "/data/adb/ksud" ]; then
        handle_ksu
    elif [ -f "/data/adb/magisk/magiskboot" ]; then
        handle_magisk
    else
        log "Error: Install from recovery is not supported. Please install from KernelSU or Magisk app"
        log "Triggering recovery mode..."
        $REBOOT_RECOVERY_CMD
    fi

    update_loops_property
}

# Execute main function
main