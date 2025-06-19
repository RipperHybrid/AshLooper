# AshLooper Module Logic - Don't modify anything after this - By Ꭺsʜʙᴏʀɴ 々 (@Ripper_Hybrid)

. "$MODPATH"/func.sh || { ui_print "Error: Failed to source func.sh"; exit 1; }

create_post_fs_data_script() {
    local root_type=$1
    cat > "$MODPATH/post-fs-data.sh" << EOF
#!/system/bin/sh

MODPATH="\${0%/*}"
. "\$MODPATH"/func.sh || { logger "Error: Failed to source func.sh"; exit 1; }

ROOT_TYPE="$root_type"
MODE="$selected_mode"

start_run
create_mod_list
handle_boot_loop
modify_prop "+" "loops"
EOF
}

mka_sve() {
    cat > "$MODPATH/service.sh" <<'EOF'
#!/system/bin/sh

MODPATH="${0%/*}"
. "$MODPATH/func.sh" || { logger "Error: Failed to source func.sh"; exit 1; }

loops=$(get_prop "loops")
timeout=$(get_prop "timeout")
disable_mode=$(get_prop "disable")
threshold=$(get_prop "threshold")

log "Executing Service.sh"
log "Checking if the device is completely booted..."

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
log "Checking the current loop value ($loops)"
new_timeout=$((elapsed + 15))
modify_prop "timeout" "$new_timeout"
log "Boot was successful and fast. Updated timeout to $new_timeout"

if [ -f "$TMP_FILE" ]; then
    if [ -d "$mdir" ]; then
        log "Saving new module list before updating history."
    fi
    if mv -f "$TMP_FILE" "$MODULE_LIST"; then
        log "Module version history updated"
    else
        log "Failed to update module version history"
    fi
fi

modify_prop "loops" "0"
modify_prop "disable" "none"
log "Resetting loop counter and protection mode."
EOF
}

if [ "$BOOTMODE" ] && [ "$KSU" ]; then
    method="KernelSU"
elif [ "$BOOTMODE" ] && [ "$MAGISK_VER_CODE" ]; then
    method="Magisk"
else
    ui_print "ERROR: KernelSU/Magisk not detected! This module requires a supported root solution."
    abort
fi

MODNAME=$(grep_prop name "$TMPDIR/module.prop")
MODVER=$(grep_prop version "$TMPDIR/module.prop")
AUTHOR=$(grep_prop author "$TMPDIR/module.prop")
DEVICE=$(getprop ro.product.device)
MODEL=$(getprop ro.product.model)
BRAND=$(getprop ro.product.brand)

ui_print "###########################"
ui_print "#      Module Details     #"
ui_print "###########################"
ui_print "- Author : $AUTHOR"
ui_print "- Module : $MODNAME"
ui_print "- Version: $MODVER"
ui_print "- Brand  : $BRAND"
ui_print "- Device : $DEVICE"
ui_print "- Model  : $MODEL"
ui_print "- Root   : $method"
[ "$method" = "KernelSU" ] && ui_print "- KernelSU: $KSU_KERNEL_VER_CODE"
[ "$method" = "Magisk" ]   && ui_print "- Magisk  : $MAGISK_VER"
ui_print "###########################"
ui_print

ui_print "######### Mode Selection #########"
ui_print "1. Disable Modules"
ui_print "2. Disable Modules & Reboot to Recovery"
ui_print "###################################"
ui_print "- Volume+ to select, Volume- to switch option"

selected_mode=""
for mode in 1 2; do
    ui_print "   >[$mode]< "
    chooseport && selected_mode="$mode" && break
done

[ -z "$selected_mode" ] && { ui_print "- No mode selected, aborting."; abort; }

case "$selected_mode" in
    1) smode="DM";  ui_print "- Selected: Disable Module Mode" ;;
    2) smode="DMR"; ui_print "- Selected: Disable & Reboot Recovery Mode" ;;
esac
ui_print "###################################"

threshold_list="1 2 3 4"
ui_print "- Select Loop Threshold:"
selected_threshold=""
for threshold in $threshold_list; do
    ui_print "   >[$threshold Threshold]< "
    chooseport && selected_threshold="$threshold" && break
done

[ -z "$selected_threshold" ] && { ui_print "- No threshold selected, aborting."; abort; }

ui_print "- Selected threshold: $selected_threshold"
modify_prop "threshold" "$selected_threshold"
ui_print "###################################"

ui_print "- Creating post-fs-data.sh, please wait..."
sleep 1
create_post_fs_data_script "$method"

ui_print "- Creating service.sh, please wait..."
sleep 1
mka_sve

ui_print "- Updating module description..."
update_description "[$method · $smode · $selected_threshold boots] AshLooper: Disables module if boot loop threshold is reached. Includes recovery and reboot options."
sleep 1

[ -f "$JQ" ] && chmod 755 "$JQ"

ui_print "- Cleaning up extra files..."
TARGETS="update.json changelog.md"
for target in $TARGETS; do
    file_path="$MODPATH/$target"
    [ ! -e "$file_path" ] && ui_print "  >[Not found: $target]<  " && continue

    if [ -d "$file_path" ]; then
        delete_recursive "$file_path" && \
        ui_print "  >[Removed directory: $target]<  " || \
        ui_print "  >[Failed to remove directory: $target]<  "
    else
        delete "$file_path" && \
        ui_print "  >[Removed: $target]<  " || \
        ui_print "  >[Failed to remove: $target]<  "
    fi
    sleep 1
done

ui_print "###########################"
ui_print "#    Module Setup Done    #"
ui_print "###########################"