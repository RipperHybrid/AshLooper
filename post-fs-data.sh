#!/system/bin/sh

MODPATH="${0%/*}"
. "$MODPATH"/utils.sh 2>>/cache/looper/looperbug.log || exit 1

ROOT_TYPE="$method"

set_log_file
start_run

modify_prop -s "sd" "" "$MODPATH/module.prop"
modify_prop -s "description" "⏳ Booting... Monitoring stability, pull to refresh for status." "$MODPATH/module.prop"

create_mod_list
handle_boot_loop
modify_prop "+" "loops"
modify_prop -s "boot" "booting" "$MODPATH/settings.prop"