# AshLooper Module Logic - Don't modify anything after this - By Ꭺsʜʙᴏʀɴ 々 (@Ripper_Hybrid)

mka_pfd() {
cat > "$MODPATH/post-fs-data.sh" << EOF
# Define paths
MODULE_PROP="/data/adb/modules/AshLooper/module.prop"
mdir="/data/adb/modules"
REBOOT_RECOVERY_CMD="reboot recovery"
REBOOT_CMD="reboot"
LOG_FILE="/cache/AshLooper.log"
PREVIOUS_LOG_FILE="\${LOG_FILE/.log/-Previous-Boot.log}"

loops=\$(grep "loops=" "\$MODULE_PROP" | cut -d '=' -f 2)

log() {
    echo "\$(date '+%d.%m.%y %T'): >[\$1]<" >> "\$LOG_FILE"
    echo "" >> "\$LOG_FILE"
}

start_run() {
    if [ -f "\$LOG_FILE" ]; then
        mv "\$LOG_FILE" "\$PREVIOUS_LOG_FILE"
    fi
}

MAGISK_THRESHOLD=$selected_threshold
MODE="$selected_mode"
reboot_triggered=false

update_loops_property() {
    log "Entering update loops property function"
    loops=\$((loops + 1))
    log "Increment the value of loops"

    log "Updating The Module Prop With New Loop Value"
    sed -i "s/loops=.*/loops=\$loops/" "\$MODULE_PROP" || log "Failed to update loops property"
}

list_modules() {
    echo "###############" >> "\$LOG_FILE"
    echo ">[Available modules:]< " >> "\$LOG_FILE"
    local count=0
    for module_folder in /data/adb/modules/*; do
        if [ -d "\$module_folder" ]; then
            module_name=\$(basename "\$module_folder")
            echo ">[\$((count + 1)). \$module_name]< " >> "\$LOG_FILE"
            count=\$((count + 1))
        fi
    done
    echo "###############" >> "\$LOG_FILE"
    echo "" >> "\$LOG_FILE"
}

handle_magisk() {
    log "Magisk detected. Checking for boot loops..."
    log "Reading the current loop value (\$loops)"
    if [ "\$loops" -ge "\$MAGISK_THRESHOLD" ]; then
        log "Threshold Limit Reached for Magisk."
        sed -i "s/loops=.*/loops=0/" "\$MODULE_PROP"
        log "Resetting The Loop Value"
        
        echo "" >> "\$LOG_FILE"
        echo "###########################" >> "\$LOG_FILE"
        echo ">[Disabling Modules Please Wait.....]<  " >> "\$LOG_FILE"
        enabled_modules=0
            for module_folder in /data/adb/modules/*; do
                if [ "\$module_folder" != "\$mdir/AshLooper" ] && [ "\$module_folder" != "\$mdir/AbootRecovery" ] && [ -d "\$module_folder" ]; then
                touch "\$module_folder/disable"
                echo ">[Disabled module: \$(basename "\$module_folder")]<  " >> "\$LOG_FILE"
                enabled_modules=\$((enabled_modules + 1))
            fi
        done
        echo "" >> "\$LOG_FILE"
        echo ">[Total Disabled: \$enabled_modules Modules]<  " >> "\$LOG_FILE"
        echo "###########################" >> "\$LOG_FILE"
        echo "" >> "\$LOG_FILE"
        
        list_modules
        if [ "\$MODE" = "2" ]; then
        log "Triggering recovery mode..."
        reboot_triggered=true
            \$REBOOT_RECOVERY_CMD
        else
        log "Triggering normal reboot..."
        reboot_triggered=true
            \$REBOOT_CMD
        fi
    else
        list_modules
    fi
}

start_run
log "Ashlooper Process Started"
log "Executing post-fs-data.sh"
handle_magisk
if ! \$reboot_triggered; then
   update_loops_property
fi

EOF
}

ksu_pfd() {
cat > "$MODPATH/post-fs-data.sh" << EOF
# Define paths
MODULE_PROP="/data/adb/modules/AshLooper/module.prop"
mdir="/data/adb/modules"
REBOOT_RECOVERY_CMD="reboot recovery"
REBOOT_CMD="reboot"
LOG_FILE="/cache/AshLooper.log"
PREVIOUS_LOG_FILE="\${LOG_FILE/.log/-Previous-Boot.log}"

loops=\$(grep "loops=" "\$MODULE_PROP" | cut -d '=' -f 2)

log() {
    echo "\$(date '+%d.%m.%y %T'): >[\$1]<" >> "\$LOG_FILE"
    echo "" >> "\$LOG_FILE"
}

start_run() {
    if [ -f "\$LOG_FILE" ]; then
        mv "\$LOG_FILE" "\$PREVIOUS_LOG_FILE"
    fi
}

KSU_THRESHOLD=$selected_threshold
MODE="$selected_mode"
reboot_triggered=false

update_loops_property() {
    log "Entering update loops property function"
    loops=\$((loops + 1))
    log "Increment the value of loops"

    log "Updating The Module Prop With New Loop Value"
    sed -i "s/loops=.*/loops=\$loops/" "\$MODULE_PROP" || log "Failed to update loops property"
}

list_modules() {
    echo "###############" >> "\$LOG_FILE"
    echo ">[Available modules:]< " >> "\$LOG_FILE"
    local count=0
    for module_folder in /data/adb/modules/*; do
        if [ -d "\$module_folder" ]; then
            module_name=\$(basename "\$module_folder")
            echo ">[\$((count + 1)). \$module_name]< " >> "\$LOG_FILE"
            count=\$((count + 1))
        fi
    done
    echo "###############" >> "\$LOG_FILE"
    echo "" >> "\$LOG_FILE"
}

handle_ksu() {
    log "KernelSU detected. Checking for boot loops..."
    log "Reading the current loop value (\$loops)"
    if [ "\$loops" -ge "\$KSU_THRESHOLD" ]; then
        log "Threshold Limit Reached for KSU."
        sed -i "s/loops=.*/loops=0/" "\$MODULE_PROP"
        log "Resetting The Loop Value"
    
        echo "" >> "\$LOG_FILE"
        echo "###########################" >> "\$LOG_FILE"
        echo ">[Disabling Modules Please Wait.....]<  " >> "\$LOG_FILE"
        enabled_modules=0
            for module_folder in /data/adb/modules/*; do
                if [ "\$module_folder" != "\$mdir/AshLooper" ] && [ "\$module_folder" != "\$mdir/AbootRecovery" ] && [ -d "\$module_folder" ]; then
                touch "\$module_folder/disable"
                echo ">[Disabled module: \$(basename "\$module_folder")]<  " >> "\$LOG_FILE"
                enabled_modules=\$((enabled_modules + 1))
            fi
        done
        echo "" >> "\$LOG_FILE"
        echo ">[Total Disabled: \$enabled_modules Modules]<  " >> "\$LOG_FILE"
        echo "###########################" >> "\$LOG_FILE"
        echo "" >> "\$LOG_FILE"
    
        list_modules
        if [ "\$MODE" = "2" ]; then
        log "Triggering recovery mode..."
        reboot_triggered=true
            \$REBOOT_RECOVERY_CMD
        else
        log "Triggering normal reboot..."
        reboot_triggered=true
            \$REBOOT_CMD
        fi
    else
        list_modules
    fi
}

start_run
log "Ashlooper Process Started"
log "Executing post-fs-data.sh"
handle_ksu
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
    method="KernelSu"
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
logger "- Brand：$Brand"
logger "- Device：$Device"
logger "- Model：$Model"
logger "- Root：$method"
if [ "$method" = "KernelSu" ]; then
    logger "- KernelSu: $KSU_KERNEL_VER_CODE"
elif [ "$method" = "Magisk" ]; then
    logger "- Magisk: $MAGISK_VER"
fi
logger "###########################"
logger " "

logger "###########################"
logger "- Select A Mode"
logger "1. Disable Modules"
logger "2. Disable Modules & Reboot Recovery"
logger "###########################"
logger "- Use Volume+ To Choose & Volume- To Switch Option!!!"
logger " "
selected_mode=""
for mode in 1 2; do
    logger "   >[$mode]< "
    if $VKSEL; then
        selected_mode="$mode"
        break
    fi
done

if [ -n "$selected_mode" ]; then
    if [ "$selected_mode" = "1" ]; then
        logger " "
        logger "- Selected mode: Disable Module Mode"
        smode="DM"
    elif [ "$selected_mode" = "2" ]; then
        logger " "
        logger "- Selected mode: Disable & Reboot Recovery Mode"
        smode="DMR"
    fi
else
    logger "- No mode selected, aborting."
    abort
fi
logger "###########################"
logger " "

threshold_list="1 2 3 4 5"
logger "###########################"
logger "- Select A Threshold For Loop Count"
logger " "
selected_threshold=""
for threshold in $threshold_list; do
    logger "   >[$threshold]< "
    if $VKSEL; then
        selected_threshold="$threshold"
        break
    fi
done

if [ -n "$selected_threshold" ]; then
    logger " "
    logger "- Selected threshold: $selected_threshold"
    logger "###########################"
    if [ "$method" = "KSU" ]; then
        logger "- Creating Post-fs-data.sh Kindly Wait"
        sleep 1
        ksu_pfd "$selected_threshold"
        logger "- Creating Service.sh Kindly Wait"
        sleep 1
        mka_sve
    elif [ "$method" = "Magisk" ]; then
        logger "- Creating Post-fs-data.sh Kindly Wait"
        sleep 1
        mka_pfd "$selected_threshold"
        logger "- Creating Service.sh Kindly Wait"
        sleep 1
        mka_sve
    fi
    logger "- Updating Module Description Kindly Wait"
    update_description "[$method × $smode Mode] AshLooper module tracks boot loops and disables the module, triggering recovery mode if necessary."
    sleep 1
    logger "- Cleaning up"
    
    TARGETS="update.json changelog.md"

    for target in $TARGETS; do
            target_name="$target"
            file_path="$MODPATH/$target"

        if [ -e "$file_path" ]; then
            if [ -d "$file_path" ]; then
                delete_recursive "$file_path"
                if [ $? -eq 0 ]; then
                    logger "  >[Removed directory: $target]<  "
                    sleep 1
                else
                    logger "  >[Failed to remove directory: $target]<  "
                fi
            else
                delete "$file_path"
                if [ $? -eq 0 ]; then
                    logger "  >[Removed: $target]<  "
                    sleep 1
                else
                    logger "  >[Failed to remove: $target]<  "
                fi
            fi
        else
            logger "  >[Not found: $target]<  "
        fi
    done
    logger "- Done!"
    else
        logger "- No threshold selected, aborting."
        abort
fi
