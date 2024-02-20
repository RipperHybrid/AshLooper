#!/bin/bash

# Define paths
MODULE_PROP="/data/adb/modules/AshLooper/module.prop"
MODULES_DIR="/data/adb/modules"
REBOOT_RECOVERY_CMD="reboot recovery"
LOG_FILE="/cache/AshLooper.log"
PREVIOUS_LOG_FILE="${LOG_FILE/.log/-Previous-Boot.log}"

# Get the current value of loops from the module property file
loops=$(grep "loops=" "$MODULE_PROP" | cut -d '=' -f 2)

# Function to log messages with timestamps into the log file
log() {
    echo "$(date): $1" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
}

# Function to handle moving the log file to a backup location
start_run() {
    if [ -f "$LOG_FILE" ]; then
        mv "$LOG_FILE" "$PREVIOUS_LOG_FILE"
    fi
}

# Thresholds for Magisk and KSU
MAGISK_THRESHOLD=3
KSU_THRESHOLD=4

# Function to update the loops property in the module property file
update_loops_property() {
    log "Entering update loops property function"
    loops=$((loops + 1))
    log "Increment the value of loops"

    sed -i "s/loops=.*/loops=$loops/" "$MODULE_PROP" || log "Failed to update loops property"
    log "Updating The Module Prop With New Loop Value"
}

# Function to list all modules present in the modules directory
list_modules() {
    log "Listing modules present in the modules directory:"
    ls -d "$MODULES_DIR"/* >> "$LOG_FILE"
    echo " ">> "$LOG_FILE"
}

# Function to handle boot loops when using KernelSU
handle_ksu() {
    log "KernelSU detected. Checking for boot loops..."
    log "Reading the current loop value ($loops)"
    if [ "$loops" -ge "$KSU_THRESHOLD" ]; then
        log "Threshold Limit Reached for KSU."
        sed -i "s/loops=.*/loops=0/" "$MODULE_PROP"
        log "Resetting The Loop Value"
    
        log "Disabling modules..."
        for module_dir in "$MODULES_DIR"/*; do
            if [ "$module_dir" != "$MODULES_DIR/AshLooper" ] && [ -d "$module_dir" ]; then
                log "Disabling: $module_dir"
                touch "$module_dir/disable"
            fi
        done
    
        list_modules
        log "Triggering recovery mode..."
        $REBOOT_RECOVERY_CMD
    else
        # Log modules only if the threshold isn't reached
        list_modules
    fi
}

# Function to handle boot loops when using Magisk
handle_magisk() {
    log "Magisk detected. Checking for boot loops..."
    log "Reading the current loop value ($loops)"
    if [ "$loops" -ge "$MAGISK_THRESHOLD" ]; then
        log "Threshold Limit Reached for Magisk."
        sed -i "s/loops=.*/loops=0/" "$MODULE_PROP"
        log "Resetting The Loop Value"
        
        log "Disabling modules..."
        for module_dir in "$MODULES_DIR"/*; do
            if [ "$module_dir" != "$MODULES_DIR/AshLooper" ] && [ -d "$module_dir" ]; then
                log "Disabling: $module_dir"
                touch "$module_dir/disable"
            fi
        done
        
        list_modules
        log "Triggering recovery mode..."
        $REBOOT_RECOVERY_CMD
    else
        # Log modules only if the threshold isn't reached
        list_modules
    fi
}

# Main function
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