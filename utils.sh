#!/system/bin/sh

SETTINGS="$MODPATH/settings.prop"
mdir="/data/adb/modules"
LOG_DIR="/cache/looper"
ASHLOOPER_DIR="/data/adb/ashlooper"
TMP_FILE="$ASHLOOPER_DIR/tmp_modules.json"
MODULE_LIST="$ASHLOOPER_DIR/module.json"
JQ="$MODPATH/jq/jq"
boot_completed=0

chooseport() {
  [ "$1" ] && local delay=$1 || local delay=10
  local error=false
  if [ -z "$TMPDIR" ]; then TMPDIR="/data/local/tmp"; fi
  mkdir -p "$TMPDIR"
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
      echo "  >[Volume key not detected. Aborting]< "
      abort
    else
      error=true
      echo "  >[Volume key not detected. Try again]< "
    fi
  done
}

delete() { rm -f "$@"; }
delete_recursive() { rm -rf "$@"; }

[ -d /data/adb/ksu ] || [ -f /data/adb/ksu/ksu ] && KSU=1
[ -d /data/adb/magisk ] || [ -f /data/adb/magisk/magisk ] && MAGISK=1
[ -f /data/adb/apd ] && [ -d /data/adb/ap ] && APATCH=1

if [ "$KSU" ]; then
    method="KernelSU"
elif [ "$APATCH" ]; then
    method="APatch"
elif [ "$MAGISK" ]; then
    method="Magisk"
else
    if [ -w "/data/adb/modules" ]; then
        method="Unknown Root"
    else
        ui_print "✘ ERROR: Root solution not detected!"
        abort
    fi
fi

get_root_version() {
    local version=""

    if [ "$APATCH" ]; then
        version=$(/data/adb/apd -V 2>/dev/null | head -n 1)
    fi

    if [ "$KSU" ]; then
        local ksu_ver=$(/data/adb/ksud -V 2>/dev/null | head -n 1)
        if [ -n "$version" ]; then
            version="$version | $ksu_ver"
        else
            version="$ksu_ver"
        fi
    fi

    if [ "$MAGISK" ]; then
        local magisk_name=$(/data/adb/magisk/magisk -v 2>/dev/null | head -n 1)
        local magisk_code=$(/data/adb/magisk/magisk -V 2>/dev/null | head -n 1)
        local magisk_ver="${magisk_name} (${magisk_code})"
        if [ -n "$version" ]; then
            version="$version | $magisk_ver"
        else
            version="$magisk_ver"
        fi
    fi

    echo "${version:-Unknown}"
}

get_prop() {
    local prop="$1"
    local target_file="${2:-$SETTINGS}"

    if [ ! -f "$target_file" ]; then
        return 1
    fi

    local value=$(grep "^$prop=" "$target_file" 2>/dev/null | head -n 1 | cut -d'=' -f2-)

    value=$(printf '%s' "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/\r$//')

    printf '%s' "$value"
}

modify_prop() {
    local silent=false
    if [ "$1" = "-s" ]; then
        silent=true
        shift
    fi
    local action="$1"
    local value="$2"
    local target_file="${3:-$SETTINGS}"

    if [ ! -f "$target_file" ]; then
        log "Error: File $target_file not found."
        return 1
    fi

    if [ "$action" = "+" ]; then
        if grep -q "^$value=" "$target_file"; then
            current=$(grep "^$value=" "$target_file" | cut -d'=' -f2)
            case "$current" in
                ''|*[!0-9]*) current=0 ;;
            esac
            new_value=$((current + 1))

            sed -i "s~^$value=.*~$value=$new_value~" "$target_file" || return 1

            if [ "$silent" = false ]; then
                log "Increased $value in $(basename "$target_file"): $current → $new_value"
            fi
        else
            if [ "$silent" = false ]; then
                log "Property $value not found in $(basename "$target_file"), skipping increment"
            fi
        fi
    else
        if grep -q "^$action=" "$target_file"; then
            local safe_value=$(echo "$value" | sed 's/&/\\&/g')
            sed -i "s~^$action=.*~$action=$safe_value~" "$target_file" || return 1

            if [ "$silent" = false ]; then
                log "Set $action to $value in $(basename "$target_file")"
            fi
        else
            if [ "$silent" = false ]; then
                log "Property $action not found in $(basename "$target_file"), skipping set"
            fi
        fi
    fi
}

set_log_file() {
    val=$(get_prop log)
    if [ -z "$val" ]; then val="1-0"; fi
    f=$(echo "$val" | cut -d'-' -f1)
    LOG_FILE="$LOG_DIR/AshReXcueSession-$f.log"
}

rotate_logs() {
    mkdir -p "$LOG_DIR"

    val=$(get_prop log)
    if [ -z "$val" ]; then val="1-0"; fi

    f=$(echo "$val" | cut -d'-' -f1)
    b=$(echo "$val" | cut -d'-' -f2)

    b=$((b + 1))

    if [ "$b" -gt 10 ]; then
        b=1
        f=$((f + 1))

        if [ "$f" -gt 10 ]; then
            f=1
        fi
    fi

    LOG_FILE="$LOG_DIR/AshReXcueSession-$f.log"

    if [ "$b" -eq 1 ]; then
        rm -f "$LOG_FILE"
        touch "$LOG_FILE"
    fi

    CURRENT_BOOT="$b"
    modify_prop -s "log" "$f-$b"
}

start_run() {
    mkdir -p "$ASHLOOPER_DIR"
    rotate_logs

    local current_date=$(date '+%Y-%m-%d' 2>/dev/null || echo "1970-01-01")
    local current_full=$(date '+%d.%m.%y %T')
    local install_date=$(get_prop install_date)
    local rtc_status="CORRECT"
    local mode=$(get_prop mode)
    local disable=$(get_prop disable)
    local check_ss=$(get_prop check_ss)
    local check_sf=$(get_prop check_sf)
    local extra_stability=$(get_prop extra_stability)

    if [ "$install_date" != "none" ] && [ "$install_date" != "unknown" ] && \
       [ "$current_date" \< "$install_date" ]; then
        rtc_status="BACKWARD ($current_date < $install_date)"
    fi

    log "◆◆◆◆◆◆◆ NEW BOOT $CURRENT_BOOT ◆◆◆◆◆◆◆◆"
    log "AshReXcue Process Started"
    log "Date: $current_full | RTC Status: $rtc_status"
    log "Executing post-fs-data.sh"
    log "Running on $ROOT_TYPE"
    ROOT_VERSION=$(get_root_version)
    log "Root Version: $ROOT_VERSION"
    local boot_reason
    boot_reason=$(getprop sys.boot.reason 2>/dev/null)
    log "Boot reason: ${boot_reason:-Unknown}"
    log "Device: $(getprop ro.product.model 2>/dev/null || echo Unknown)"
    log "Android: $(getprop ro.build.version.release 2>/dev/null || echo Unknown)"
    log "Module Version: $(get_prop version "$MODPATH/module.prop" 2>/dev/null || echo Unknown)"
    log "Module Version Code: $(get_prop versionCode "$MODPATH/module.prop" 2>/dev/null || echo Unknown)"
    log "Mode: $mode | Disable: $disable"
    log "Check SS: $check_ss | Check SF: $check_sf"
    log "Extra Stability: $extra_stability"
}

log() {
    if [ -z "$LOG_FILE" ]; then set_log_file; fi
    local timestamp=$(date '+%T')
    echo "[$timestamp] >[$1]<" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
}

list_modules() {
    log "###############"
    log "Available modules: "
    count=0
    for module_folder in "$mdir"/*; do
        if [ -d "$module_folder" ]; then
            module_name=$(basename "$module_folder")
            status="- Enabled"
            [ -f "$module_folder/disable" ] && status="- Disabled"
            log "$((count + 1)). $module_name $status"
            count=$((count + 1))
        fi
    done
    log "###############"
}

lockdown() {
    local MODE=$(get_prop "mode")
    local LOCKDOWN_TYPE="${1:-normal}"
    threshold=$(get_prop "threshold")

    if [ "$LOCKDOWN_TYPE" = "full" ]; then
        log "Full Lockdown: Threshold ($threshold) reached. Disabling ALL modules including AshLooper..."
    else
        log "Threshold ($threshold) reached. Disabling non-protected modules..."
    fi

    log "###########################"
    log "Lockdown Mode Activated"
    enabled_modules=0
    for module_folder in "$mdir"/*; do
        if [ -d "$module_folder" ]; then
            module_name=$(basename "$module_folder")
            if [ "$LOCKDOWN_TYPE" != "full" ] && [ "$module_name" = "AshLooper" ]; then
                continue
            fi
            touch "$module_folder/disable"
            log "Disabled module: $module_name"
            enabled_modules=$((enabled_modules + 1))
        fi
    done
    log "Total Disabled: $enabled_modules"
    log "###########################"
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
    local first=1

    for module_folder in "$mdir"/*; do
        if [ -d "$module_folder" ]; then
            size=$(du -s "$module_folder" 2>/dev/null | cut -f1)

            if [ -f "$module_folder/disable" ]; then
                status="disabled"
            else
                status="enabled"
            fi

            folder_name=$(basename "$module_folder")

            id="$folder_name"
            name="$folder_name"
            version="unknown"
            versionCode="0"

            if [ -f "$module_folder/module.prop" ]; then
                prop_id=$(get_prop "id" "$module_folder/module.prop")
                prop_name=$(get_prop "name" "$module_folder/module.prop")
                prop_version=$(get_prop "version" "$module_folder/module.prop")
                prop_versionCode=$(get_prop "versionCode" "$module_folder/module.prop")

                [ -n "$prop_id" ] && id="$prop_id"
                [ -n "$prop_name" ] && name="$prop_name"
                [ -n "$prop_version" ] && version="$prop_version"
                [ -n "$prop_versionCode" ] && versionCode="$prop_versionCode"
            fi

            name=$(printf '%s' "$name" | sed 's/"/\\"/g')
            version=$(printf '%s' "$version" | sed 's/"/\\"/g')

            [ "$first" -eq 0 ] && printf ',' >> "$TMP_FILE"
            printf '\n  {"id": "%s", "name": "%s", "version": "%s", "versionCode": "%s", "status": "%s", "size": "%s"}' "$id" "$name" "$version" "$versionCode" "$status" "$size" >> "$TMP_FILE"
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
        return
    fi

    changed_ids=$(
        "$JQ" -n --slurpfile new "$TMP_FILE" --slurpfile old "$MODULE_LIST" '
          ($old[0] | map({key: .id, value: .}) | from_entries) as $oldmap |
          $new[0][] as $n |
          ($oldmap[$n.id] // null) as $o |
          if $o == null or ($n.name != $o.name or $n.version != $o.version or $n.versionCode != $o.versionCode or $n.status != $o.status or $n.size != $o.size) then
            $n.id
          else
            empty
          end
        ' 2>/dev/null || echo ""
    )

    if [ -z "$changed_ids" ]; then
        log "No new/updated modules detected. Invoking lockdown."
        lockdown
        return
    fi

    formatted_log=$(printf '%s' "$changed_ids" | tr '\n' ',' | sed 's/,$//' | sed 's/,/, /g' 2>/dev/null || echo "format_failed")
    log "Changed/Added modules detected: $formatted_log"
    log "Starting disable process..."

    printf '%s\n' "$changed_ids" | while IFS= read -r id || [ -n "$id" ]; do
        id_clean=$(printf '%s' "$id" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"\(.*\)"$/\1/')

        if [ -d "$mdir/$id_clean" ]; then
            touch "$mdir/$id_clean/disable"
            log "Module disabled: $mdir/$id_clean"
        else
            log "Module folder not found: $mdir/$id_clean"
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
                log "Well, you're fu*ked ¯\\_(ツ)_/¯"
                log "Full protection enabled but bootloop still occurred"
                log "Disabling all modules including AshLooper."
                lockdown "full"
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