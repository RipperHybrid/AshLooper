# AshLooper Module Logic - Don't modify anything after this - By Ꭺsʜʙᴏʀɴ 々 (@Ripper_Hybrid)

create_post_fs_data_script() {
    local root_type=$1
    cat > "$MODPATH/post-fs-data.sh" << EOF
#!/system/bin/sh

MODULE_PROP="/data/adb/modules/AshLooper/module.prop"
mdir="/data/adb/modules"
REBOOT_RECOVERY_CMD="reboot recovery"
REBOOT_CMD="reboot"
LOG_FILE="/cache/AshLooper.log"
PREVIOUS_LOG_FILE="\${LOG_FILE/.log/-Previous-Boot.log}"

ROOT_TYPE="$root_type"
THRESHOLD=$selected_threshold
MODE="$selected_mode"
PROTECTED_MODULES="AshLooper AbootRecovery"

loops=\$(grep "loops=" "\$MODULE_PROP" | cut -d '=' -f 2)
reboot_triggered=false

log() {
    echo "\$(date '+%d.%m.%y %T'): >[\$1]<" >> "\$LOG_FILE"
    echo "" >> "\$LOG_FILE"
}

start_run() {
    if [ -f "\$LOG_FILE" ]; then
        mv "\$LOG_FILE" "\$PREVIOUS_LOG_FILE"
    fi
    log "Ashlooper Process Started"
    log "Executing post-fs-data.sh"
    log "Running on \$ROOT_TYPE"
}

update_loops_property() {
    loops=\$((loops + 1))
    sed -i "s/loops=.*/loops=\$loops/" "\$MODULE_PROP" || log "Failed to update loops property"
}

list_modules() {
    echo "###############" >> "\$LOG_FILE"
    echo ">[Available modules:]< " >> "\$LOG_FILE"
    local count=0
    for module_folder in \$mdir/*; do
        if [ -d "\$module_folder" ]; then
            module_name=\$(basename "\$module_folder")
            status="[Enabled]"
            [ -f "\$module_folder/disable" ] && status="[Disabled]"
            echo ">[\$((count + 1)). \$module_name]< \$status" >> "\$LOG_FILE"
            count=\$((count + 1))
        fi
    done
    echo "###############" >> "\$LOG_FILE"
    echo "" >> "\$LOG_FILE"
}

is_protected_module() {
    local module=\$1
    for protected in \$PROTECTED_MODULES; do
        if [ "\$module" = "\$protected" ]; then
            return 0
        fi
    done
    return 1
}

disable_non_protected_modules() {
    log "Threshold (\$THRESHOLD) reached for \$ROOT_TYPE. Disabling modules..."
    
    echo "" >> "\$LOG_FILE"
    echo "###########################" >> "\$LOG_FILE"
    echo ">[Disabling Modules Please Wait.....]<  " >> "\$LOG_FILE"
    
    enabled_modules=0
    for module_folder in \$mdir/*; do
        if [ -d "\$module_folder" ]; then
            module_name=\$(basename "\$module_folder")
            if ! is_protected_module "\$module_name"; then
                touch "\$module_folder/disable"
                echo ">[Disabled module: \$module_name]<  " >> "\$LOG_FILE"
                enabled_modules=\$((enabled_modules + 1))
            fi
        fi
    done
    
    echo "" >> "\$LOG_FILE"
    echo ">[Total Disabled: \$enabled_modules Modules]<  " >> "\$LOG_FILE"
    echo "###########################" >> "\$LOG_FILE"
    echo "" >> "\$LOG_FILE"
    
    sed -i "s/loops=.*/loops=0/" "\$MODULE_PROP"
}

handle_boot_loop() {
    log "Checking boot loop counter: \$loops"
    
    if [ "\$loops" -ge "\$THRESHOLD" ]; then
        disable_non_protected_modules
        log "Checking Modules Status"
        list_modules
        
        if [ "\$MODE" = "2" ]; then
            log "Triggering recovery reboot"
            reboot_triggered=true
            \$REBOOT_RECOVERY_CMD
        else
            log "Triggering normal reboot"
            reboot_triggered=true
            \$REBOOT_CMD
        fi
    else
        list_modules
    fi
}

start_run
handle_boot_loop
if ! \$reboot_triggered; then
    update_loops_property
fi
EOF
}

mka_sve() {
cat > "$MODPATH/service.sh" << EOF
#!/bin/bash

# Define paths
MODULE_PROP="/data/adb/modules/AshLooper/module.prop"
LOG_FILE="/cache/AshLooper.log"
loops=\$(grep "loops=" "\$MODULE_PROP" | cut -d '=' -f 2)

log() {
    echo "\$(date '+%d.%m.%y %T'): >[\$1]<" >> "\$LOG_FILE"
    echo "" >> "\$LOG_FILE"
}

log "Executing Service.sh"
log "Checking if the device is completely booted..."
sleep 0.5

until [ "\$(getprop sys.boot_completed)" = "1" ]; do
    log "Device is not completely booted yet. Waiting..."
    sleep 0.5
done

log "Device is completely booted."
log "Checking the current loop value (\$loops)"

sed -i "s/loops=.*/loops=0/" "\$MODULE_PROP"
log "Resetting the loop value to 0."

EOF
}

if [ "$BOOTMODE" ] && [ "$KSU" ]; then
    method="KernelSU"
elif [ "$BOOTMODE" ] && [ "$MAGISK_VER_CODE" ]; then
    method="Magisk"
else
    logger "Neither KernelSU nor Magisk detected. Please install the module using a supported root method."
    abort
fi

MODNAME=$(grep_prop name $TMPDIR/module.prop)
MODVER=$(grep_prop version $TMPDIR/module.prop)
DV=$(grep_prop author $TMPDIR/module.prop)
Device=$(getprop ro.product.device)
Model=$(getprop ro.product.model)
Brand=$(getprop ro.product.brand)

logger "###########################"
logger "- Author: $DV"
logger "- Module: $MODNAME"
logger "- Version: $MODVER"
logger "- Brand: $Brand"
logger "- Device: $Device"
logger "- Model: $Model"
logger "- Root: $method"
[ "$method" = "KernelSU" ] && logger "- KernelSU: $KSU_KERNEL_VER_CODE"
[ "$method" = "Magisk" ] && logger "- Magisk: $MAGISK_VER"
logger "###########################"
logger " "

logger "###########################"
logger "- Select A Mode"
logger "1. Disable Modules"
logger "2. Disable Modules & Reboot Recovery"
logger "###########################"
logger "- Use Volume+ To Choose & Volume- To Switch Option!!!"

selected_mode=""
for mode in 1 2; do
    logger "   >[$mode]< "
    $VKSEL && selected_mode="$mode" && break
done

[ -z "$selected_mode" ] && { logger "- No mode selected, aborting."; abort; }

case "$selected_mode" in
    1) smode="DM"; logger "- Selected mode: Disable Module Mode" ;;
    2) smode="DMR"; logger "- Selected mode: Disable & Reboot Recovery Mode" ;;
esac

logger "###########################"

threshold_list="1 2 3 4 5"
logger "- Select A Threshold For Loop Count"

selected_threshold=""
for threshold in $threshold_list; do
    logger "   >[$threshold]< "
    $VKSEL && selected_threshold="$threshold" && break
done

[ -z "$selected_threshold" ] && { logger "- No threshold selected, aborting."; abort; }

logger "- Selected threshold: $selected_threshold"
logger "###########################"

logger "- Creating Post-fs-data.sh Kindly Wait"
sleep 1
create_post_fs_data_script "$method"

logger "- Creating Service.sh Kindly Wait"
sleep 1
mka_sve

logger "- Updating Module Description Kindly Wait"
update_description "[$method × $smode Mode] AshLooper module tracks boot loops and disables the module if necessary. Options for recovery or reboot."
sleep 1

logger "- Cleaning up"
TARGETS="update.json changelog.md"

for target in $TARGETS; do
    file_path="$MODPATH/$target"
    [ ! -e "$file_path" ] && logger "  >[Not found: $target]<  " && continue
    
    if [ -d "$file_path" ]; then
        delete_recursive "$file_path" && logger "  >[Removed directory: $target]<  " || logger "  >[Failed to remove directory: $target]<  "
    else
        delete "$file_path" && logger "  >[Removed: $target]<  " || logger "  >[Failed to remove: $target]<  "
    fi
    sleep 1
done

logger "- Done!"