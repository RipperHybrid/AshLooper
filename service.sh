#!/bin/bash

# Define paths
MODULE_PROP="/data/adb/modules/AshLooper/module.prop"
LOG_FILE="/cache/AshLooper.log"
loops=$(grep "loops=" "$MODULE_PROP" | cut -d '=' -f 2)

log() {
    echo "$(date): $1" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
}


check_device_booted() {
    log "Executing Service.sh"
    log "Checking if the device is completely booted..."
    sleep 0.5
    
    until [ "$(getprop sys.boot_completed)" = "1" ]; do
        log "Device is not completely booted yet. Waiting..."
        sleep 0.5
    done

    log "Device is completely booted."
    log "Checking the current loop value ($loops)"

    sed -i "s/loops=.*/loops=0/" "$MODULE_PROP"
    log "Resetting the loop value to 0."

}

# Execute the function
check_device_booted