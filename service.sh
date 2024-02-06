#!/bin/bash

# Define paths
BOOT_FILE="/data/adb/modules/AshLooper/boot_count"
MODULE_PROP="/data/adb/modules/AshLooper/module.prop"
LOG_FILE="/cache/AshLooper.log"


log() {
    echo "$(date): $1" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
}


check_device_booted() {
    log "Executing Service.sh"
    log "Checking if the device is completely booted..."
    sleep 5
    
    until [ "$(getprop sys.boot_completed)" = "1" ]; do
        log "Device is not completely booted yet. Waiting..."
        sleep 1
    done

    log "Device is completely booted."

    sed -i "s/loops=.*/loops=0/" "$MODULE_PROP"
    log "Resetting the loop value to 0."

}

# Execute the function
check_device_booted