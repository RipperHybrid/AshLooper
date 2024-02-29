#!/sbin/sh

mka_pfd() {
cat > "$MODPATH/post-fs-data.sh" << EOF
# Define paths
MODULE_PROP="/data/adb/modules/AshLooper/module.prop"
MODULES_DIR="/data/adb/modules"
REBOOT_RECOVERY_CMD="reboot recovery"
LOG_FILE="/cache/AshLooper.log"
PREVIOUS_LOG_FILE="\${LOG_FILE/.log/-Previous-Boot.log}"

# Get the current value of loops from the module property file
loops=\$(grep "loops=" "\$MODULE_PROP" | cut -d '=' -f 2)

# Function to log messages with timestamps into the log file
log() {
    echo "\$(date): \$1" >> "\$LOG_FILE"
    echo "" >> "\$LOG_FILE"
}

# Function to handle moving the log file to a backup location
start_run() {
    if [ -f "\$LOG_FILE" ]; then
        mv "\$LOG_FILE" "\$PREVIOUS_LOG_FILE"
    fi
}

# Thresholds for Magisk
MAGISK_THRESHOLD=$selected_threshold

# Flag to track if recovery mode is triggered
recovery_triggered=false

# Function to update the loops property in the module property file
update_loops_property() {
    log "Entering update loops property function"
    loops=\$((loops + 1))
    log "Increment the value of loops"

    sed -i "s/loops=.*/loops=\$loops/" "\$MODULE_PROP" || log "Failed to update loops property"
    log "Updating The Module Prop With New Loop Value"
}

# Function to list all modules present in the modules directory
list_modules() {
    log "Listing modules present in the modules directory:"
    ls -d "\$MODULES_DIR"/* >> "\$LOG_FILE"
    echo "" >> "\$LOG_FILE"
}


# Function to handle boot loops when using Magisk
handle_magisk() {
    log "Magisk detected. Checking for boot loops..."
    log "Reading the current loop value (\$loops)"
    if [ "\$loops" -ge "\$MAGISK_THRESHOLD" ]; then
        log "Threshold Limit Reached for Magisk."
        sed -i "s/loops=.*/loops=0/" "\$MODULE_PROP"
        log "Resetting The Loop Value"
        
        log "Disabling modules..."
        for module_dir in "\$MODULES_DIR"/*; do
            if [ "\$module_dir" != "\$MODULES_DIR/AshLooper" ] && [ -d "\$module_dir" ]; then
                log "Disabling: \$module_dir"
                touch "\$module_dir/disable"
            fi
        done
        
        list_modules
        log "Triggering recovery mode..."
        recovery_triggered=true
        \$REBOOT_RECOVERY_CMD
    else
        # Log modules only if the threshold isn't reached
        list_modules
    fi
}

# Main function
main() {
    start_run
    log "Executing post-fs-data.sh"   
    handle_magisk
    if ! \$recovery_triggered; then
    update_loops_property
    fi
}

# Execute main function
main
EOF
}

ksu_pfd() {
cat > "$MODPATH/post-fs-data.sh" << EOF
# Define paths
MODULE_PROP="/data/adb/modules/AshLooper/module.prop"
MODULES_DIR="/data/adb/modules"
REBOOT_RECOVERY_CMD="reboot recovery"
LOG_FILE="/cache/AshLooper.log"
PREVIOUS_LOG_FILE="\${LOG_FILE/.log/-Previous-Boot.log}"

# Get the current value of loops from the module property file
loops=\$(grep "loops=" "\$MODULE_PROP" | cut -d '=' -f 2)

# Function to log messages with timestamps into the log file
log() {
    echo "\$(date): \$1" >> "\$LOG_FILE"
    echo "" >> "\$LOG_FILE"
}

# Function to handle moving the log file to a backup location
start_run() {
    if [ -f "\$LOG_FILE" ]; then
        mv "\$LOG_FILE" "\$PREVIOUS_LOG_FILE"
    fi
}

# Thresholds for KernelSU
KSU_THRESHOLD=$selected_threshold

# Flag to track if recovery mode is triggered
recovery_triggered=false

# Function to update the loops property in the module property file
update_loops_property() {
    log "Entering update loops property function"
    loops=\$((loops + 1))
    log "Increment the value of loops"

    sed -i "s/loops=.*/loops=\$loops/" "\$MODULE_PROP" || log "Failed to update loops property"
    log "Updating The Module Prop With New Loop Value"
}

# Function to list all modules present in the modules directory
list_modules() {
    log "Listing modules present in the modules directory:"
    ls -d "\$MODULES_DIR"/* >> "\$LOG_FILE"
    echo "" >> "\$LOG_FILE"
}


# Function to handle boot loops when using KernelSU
handle_ksu() {
    log "KernelSU detected. Checking for boot loops..."
    log "Reading the current loop value (\$loops)"
    if [ "\$loops" -ge "\$KSU_THRESHOLD" ]; then
        log "Threshold Limit Reached for KSU."
        sed -i "s/loops=.*/loops=0/" "\$MODULE_PROP"
        log "Resetting The Loop Value"
    
        log "Disabling modules..."
        for module_dir in "\$MODULES_DIR"/*; do
            if [ "\$module_dir" != "\$MODULES_DIR/AshLooper" ] && [ -d "\$module_dir" ]; then
                log "Disabling: \$module_dir"
                touch "\$module_dir/disable"
            fi
        done
    
        list_modules
        log "Triggering recovery mode..."
        recovery_triggered=true
        \$REBOOT_RECOVERY_CMD
    else
        # Log modules only if the threshold isn't reached
        list_modules
    fi
}


# Main function
main() {
    start_run
    log "Executing post-fs-data.sh"
    handle_ksu
    if ! \$recovery_triggered; then
    update_loops_property
    fi
}

# Execute main function
main
EOF
}
    
MODULE_PATH="/data/adb/modules/AshLooper"
KSU_PATH="/data/adb/ksu/modules.img"
MODULE_PROP="$MODPATH/module.prop"

update_description() {
    sed -i "s|^description=.*|description=$1|g" "$MODULE_PROP"
}

if [ "$BOOTMODE" ] && [ "$KSU" ]; then
    threshold_list="1 2 3 4 5 6"
    rm -rf "$KSU_PATH"
    update_description "[KernelSU Mode] AshLooper module tracks boot loops and disables the module, triggering recovery mode if necessary."
    method="KSU"
  if [ "$(which magisk)" ]; then
    ui_print "*********************************************************"
    ui_print "! Multiple root implementation is NOT supported!"
    ui_print "! Please uninstall Magisk before installing Zygisksu"
    abort    "*********************************************************"
fi
elif [ "$BOOTMODE" ] && [ "$MAGISK_VER_CODE" ]; then
      threshold_list="1 2 3 4 5"
    update_description "[Magisk Mode] AshLooper module tracks boot loops and disables the module, triggering recovery mode if necessary."
    if [ -d "$MODULE_PATH" ]; then
        rm -rf "$MODULE_PATH"
    fi
    method="Magisk"
else
  ui_print "Neither KernelSU nor Magisk detected. Please install the module using a supported root method."
    abort
fi

# Display module information
MODNAME=$(grep_prop name $TMPDIR/module.prop)
MODVER=$(grep_prop version $TMPDIR/module.prop)
DV=$(grep_prop author $TMPDIR/module.prop)
Device=$(getprop ro.product.device)
Model=$(getprop ro.product.model)
Brand=$(getprop ro.product.brand)

ui_print "###########################"
ui_print "- Author: $DV"
ui_print "- Module: $MODNAME"
ui_print "- Version: $MODVER"
ui_print "- Kernel: $(uname -r)"
ui_print "- Brand：$Brand"
ui_print "- Device：$Device"
ui_print "- Model：$Model"
ui_print "- Root：$method"
if [ "$method" = "KSU" ]; then
ui_print "- KernelSu: $KSU_KERNEL_VER_CODE"
elif [ "$method" = "Magisk" ]; then
ui_print "- Magisk: $MAGISK_VER"
fi
ui_print "###########################"
ui_print "- Select A Threshold For Loop Count"
ui_print "- Volume up (-) to change selection"
ui_print "- Volume down (+) to decide"
ui_print " "

selected_threshold=""
for threshold in $threshold_list; do
    ui_print "  >[$threshold]< "
    ui_print " "
    if $VKSEL; then
        selected_threshold="$threshold"
        break
    fi
done

if [ "$selected_threshold" = "1" ]; then 
ui_print "- Threshold 1 May Be Too Short For Accurate Detection."
ui_print "- I Don't Recommend It"
fi

if [ -n "$selected_threshold" ]; then
    ui_print "- Selected threshold: $selected_threshold"
    if [ "$method" = "KSU" ]; then
        ksu_pfd "$selected_threshold"
    elif [ "$method" = "Magisk" ]; then
        mka_pfd "$selected_threshold"
    fi
else
    ui_print "Error: No threshold selected for installation. Exiting."
    rm -rf "$MODPATH"
    abort
fi