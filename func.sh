#!/system/bin/sh

MODULE_PROP="$MODPATH/module.prop"
mdir="/data/adb/modules"
LOG_DIR="/cache/looper"
ASHLOOPER_DIR="/data/adb/ashlooper"
LOG_HISTORY=10
TMP_FILE="$ASHLOOPER_DIR/tmp_modules.json"
MODULE_LIST="$ASHLOOPER_DIR/module.json"
JQ="$MODPATH/jq/jq"
boot_completed=0

chooseport() {
  [ "$1" ] && local delay=$1 || local delay=10
  local error=false 
  while true; do
    local count=0
    while true; do
      timeout $delay /system/bin/getevent -lqc 1 2>&1 > $TMPDIR/events &
      sleep 0.5; count=$((count + 1))
      if (`grep -q 'KEY_VOLUMEUP *DOWN' $TMPDIR/events`); then
        return 0
      elif (`grep -q 'KEY_VOLUMEDOWN *DOWN' $TMPDIR/events`); then
        return 1
      fi
      [ $count -gt 12 ] && break
    done
    if $error; then
      logger "  >[Volume key not detected. Aborting]< "
      abort
    else
      error=true
      logger "  >[Volume key not detected. Try again]< "
    fi
  done
}

delete() { rm -f "$@"; }

delete_recursive() { rm -rf "$@"; }

log() {
    echo "$(date '+%d.%m.%y %T'): >[$1]<" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
}

update_description() {
    sed -i "s|^description=.*|description=$1|g" "$MODPATH/module.prop"
}

rotate_logs() {
    mkdir -p "$LOG_DIR"
    
    current_date=$(date '+%Y-%m-%d')
    current_log="$LOG_DIR/AshReXcueSession-$current_date.log"
    
    if [ ! -f "$current_log" ]; then
        all_logs=$(ls -1 "$LOG_DIR"/AshReXcue*.log 2>/dev/null | wc -l)
        
        if [ "$all_logs" -ge $LOG_HISTORY ]; then
            oldest_log=$(ls -1tr "$LOG_DIR"/AshReXcue*.log 2>/dev/null | head -n 1)
            if [ -n "$oldest_log" ]; then
                rm -f "$oldest_log"
            fi
        fi
    fi
}

set_log_file() {
    current_date=$(date '+%Y-%m-%d')
    LOG_FILE="$LOG_DIR/AshReXcueSession-$current_date.log"
}

start_run() {
    mkdir -p "$ASHLOOPER_DIR"
    rotate_logs
    set_log_file

    log "◆◆◆◆◆◆◆ NEW BOOT ◆◆◆◆◆◆◆◆"
    log "AshReXcue Process Started"
    log "Executing post-fs-data.sh"
    log "Running on $ROOT_TYPE"
    local boot_reason
    boot_reason=$(getprop sys.boot.reason 2>/dev/null)
    log "Boot reason: ${boot_reason:-Unknown}"
    log "Device: $(getprop ro.product.model 2>/dev/null || echo Unknown)"
    log "Android: $(getprop ro.build.version.release 2>/dev/null || echo Unknown)"
}

get_prop() {
    grep "^$1=" "$MODULE_PROP" | cut -d'=' -f2
}

modify_prop() {
    action="$1"
    value="$2"

    if [ "$action" = "+" ]; then
        if grep -q "^$value=" "$MODULE_PROP"; then
            current=$(grep "^$value=" "$MODULE_PROP" | cut -d'=' -f2)
            case "$current" in
                ''|*[!0-9]*) current=0 ;;
            esac
            new_value=$((current + 1))
            sed -i "s/^$value=.*/$value=$new_value/" "$MODULE_PROP" || return 1
            log "Increased $value: $current → $new_value"
        else
            log "Property $value not found, skipping increment"
        fi
    else
        if grep -q "^$action=" "$MODULE_PROP"; then
            sed -i "s/^$action=.*/$action=$value/" "$MODULE_PROP" || return 1
            log "Set $action to $value"
        else
            log "Property $action not found, skipping set"
        fi
    fi
}

list_modules() {
    echo "###############" >> "$LOG_FILE"
    echo ">[Available modules:]< " >> "$LOG_FILE"
    count=0
    for module_folder in "$mdir"/*; do
        if [ -d "$module_folder" ]; then
            module_name=$(basename "$module_folder")
            status="[Enabled]"
            [ -f "$module_folder/disable" ] && status="[Disabled]"
            echo ">[$((count + 1)). $module_name]< $status" >> "$LOG_FILE"
            count=$((count + 1))
        fi
    done
    echo "###############" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
}

lockdown() {
    local MODE=$(get_prop "mode") # <-- FIX: Read MODE from prop
    threshold=$(get_prop "threshold")
    log "Threshold ($threshold) reached. Disabling non-protected modules..."

    echo "###########################" >> "$LOG_FILE"
    echo ">[Lockdown Mode Activated]<" >> "$LOG_FILE"

    enabled_modules=0
    for module_folder in "$mdir"/*; do
        if [ -d "$module_folder" ]; then
            module_name=$(basename "$module_folder")
            if [ "$module_name" != "AshLooper" ]; then
                touch "$module_folder/disable"
                echo ">[Disabled module: $module_name]<" >> "$LOG_FILE"
                enabled_modules=$((enabled_modules + 1))
            fi
        fi
    done

    echo ">[Total Disabled: $enabled_modules]<" >> "$LOG_FILE"
    echo "###########################" >> "$LOG_FILE"

    modify_prop "loops" "0" 
    modify_prop "disable" "full"
    if [ "$MODE" = "2" ]; then
        log "Lockdown complete. Rebooting to recovery."
        reboot recovery
    else
        log "Lockdown complete. Rebooting normally."
        reboot
    fi
}

create_mod_list() {
    rm -f "$TMP_FILE"
    printf '[' > "$TMP_FILE"
    first=1
    for m in "$mdir"/*; do
        if [ -d "$m" ] && [ -f "$m/module.prop" ]; then
            folder_name=$(basename "$m")
            id=$(grep '^id=' "$m/module.prop" 2>/dev/null | cut -d'=' -f2)
            version=$(grep '^version=' "$m/module.prop" 2>/dev/null | cut -d'=' -f2)
            versionCode=$(grep '^versionCode=' "$m/module.prop" 2>/dev/null | cut -d'=' -f2)
            
            size=$(du -s "$m" 2>/dev/null | cut -f1)

            if [ -f "$m/disable" ]; then
                status="disabled"
            else
                status="enabled"
            fi
            
            [ $first -eq 0 ] && printf ',' >> "$TMP_FILE"
            
            printf '\n  {"id": "%s", "version": "%s", "versionCode": "%s", "folder": "%s", "status": "%s", "size": "%s"}' "$id" "$version" "$versionCode" "$folder_name" "$status" "$size" >> "$TMP_FILE"
            
            first=0
        fi
    done
    printf '\n]\n' >> "$TMP_FILE"
}


disable_new_mods() {
    local MODE=$(get_prop "mode")
    if [ ! -f "$MODULE_LIST" ]; then
        log "No previous module list found. Invoking lockdown."
        lockdown
    else
        changed_ids=$(
            "$JQ" -n --slurpfile new "$TMP_FILE" --slurpfile old "$MODULE_LIST" '
              ($old[0] | map({key: (.id + "|" + .folder), value: .}) | from_entries) as $oldmap |
              $new[0][] as $n |
              ($oldmap[$n.id + "|" + $n.folder] // null) as $o |
              if $o == null or ($n.version != $o.version or $n.versionCode != $o.versionCode or $n.status != $o.status or $n.size != $o.size) then
                $n.id
              else
                empty
              end
            '
        )

        log "Changed/Added modules detected: $changed_ids"

        if [ -n "$changed_ids" ]; then
            log "Detected problematic modules. Starting disable process."
            printf '%s\n' "$changed_ids" | while IFS= read -r id; do
                id=$(printf '%s' "$id" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"\(.*\)"$/\1/')
                log "Checking: $mdir/$id"
                if [ -d "$mdir/$id" ]; then
                    touch "$mdir/$id/disable"
                    log "Module disabled: $mdir/$id"
                else
                    log "Module folder not found: $mdir/$id"
                fi
            done
            modify_prop "loops" "0"
            modify_prop "disable" "partial"
            if [ "$MODE" = "2" ]; then
                log "Partial disable complete. Rebooting to recovery."
                reboot recovery
            else
                log "Partial disable complete. Rebooting normally."
                reboot
            fi
        else
            log "No problematic modules detected; invoking lockdown."
            lockdown
        fi
    fi
}

handle_boot_loop() {
    local MODE=$(get_prop "mode")
    loops=$(get_prop "loops")
    disable_mode=$(get_prop "disable")
    threshold=$(get_prop "threshold")
    log "Boot loops: $loops/$threshold | Protection: $disable_mode"

    if [ "$loops" -ge "$threshold" ]; then
        case "$disable_mode" in
            "none")
                log "Threshold reached - disabling new modules"
                disable_new_mods
                ;;
            "partial")
                log "Threshold reached - activating lockdown"
                lockdown
                ;;
            "full")
                log "Well, you're fucked ¯\\_(ツ)_/¯"
                log "Full protection enabled but bootloop still occurred"
                log "Disabling AshReXcue module."
                touch "$MODPATH/disable"
                ;;
            *)
                log "Invalid protection mode - taking no action"
                ;;
        esac

        list_modules
    else
        list_modules
    fi
}
