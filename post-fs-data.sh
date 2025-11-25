#!/system/bin/sh
# AshReXcue post-fs-data Logic - Don't modify anything after this - By AshBorn (@Ripper_Hybrid)

MODPATH="${0%/*}"
. "$MODPATH"/func.sh || { logger "Error: Failed to source func.sh"; exit 1; }

ROOT_TYPE="$method"

set_log_file
start_run
create_mod_list
handle_boot_loop
modify_prop "+" "loops"
