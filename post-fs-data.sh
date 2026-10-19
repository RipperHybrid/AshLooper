#!/system/bin/sh

MODPATH="${0%/*}"
. "$MODPATH"/utils.sh || exit 1

ROOT_TYPE="$method"

set_log_file
start_run

create_mod_list

if is_soft_reboot; then
    log "Soft reboot detected. Resetting loop counter."
    modify_prop -s "loops" "0"
    modify_prop -s "disable" "none"
    modify_prop -s "boot" "booted"
    log "######## THE END ##########"
else
    modify_prop -s "sd" "" "$MODPATH/module.prop"
    modify_prop -s "description" "⏳ Booting... Monitoring stability, pull to refresh for status." "$MODPATH/module.prop"
    handle_boot_loop
    modify_prop "+" "loops"
    modify_prop -s "boot" "booting"
fi