#!/system/bin/sh

MODPATH="${0%/*}"
. "$MODPATH"/func.sh || { logger "Error: Failed to source func.sh"; exit 1; }

ROOT_TYPE="$method"

set_log_file
start_run
create_mod_list
handle_boot_loop
modify_prop "+" "loops"
