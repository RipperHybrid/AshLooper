. "$MODPATH/utils.sh" || { echo "! Failed to load utils.sh"; abort; }

MODVER=$(grep_prop version "$TMPDIR/module.prop")
MODVCODE=$(grep_prop versionCode "$TMPDIR/module.prop")
DEVICE=$(getprop ro.product.device)
MODEL=$(getprop ro.product.model)
BRAND=$(getprop ro.product.brand)
ROOT_VERSION=$(get_root_version)
ZIP_BIN="$MODPATH/bin/zip"
[ -f "$ZIP_BIN" ] && chmod 755 "$ZIP_BIN"
[ -f "$JQ" ] && chmod 755 "$JQ"

ui_print ""
ui_print "  ================================"
ui_print "           AshReXcue"
ui_print "       BootLoop Protector"
ui_print "  ================================"
ui_print "  Version: $MODVER ($MODVCODE)"
ui_print ""
ui_print "  Device : $BRAND $MODEL ($DEVICE)"
ui_print "  Root   : $method ($ROOT_VERSION)"
ui_print "  ================================"
ui_print ""
ui_print "  Initializing..."
sleep 0.5

ui_print ""
ui_print "◆ (1/5) Protection mode?"
ui_print ""
ui_print "   1) Standard  - Disable bad modules"
ui_print "   2) Nuclear   - Same as Standard + reboots to recovery"
ui_print ""
ui_print "  [Vol+ = Select | Vol- = Next]"

menu_cur=1
while true; do
  ui_print "  ► Option $menu_cur"
  chooseport 8
  key=$?
  [ "$key" -eq 0 ] && break
  menu_cur=$((menu_cur % 2 + 1))
done
selected_mode=$menu_cur
case "$selected_mode" in
  1) smode="DM";  desc="Disable Modules" ;;
  2) smode="DMR"; desc="Disable + Recovery" ;;
esac
modify_prop -s "mode" "$selected_mode"
ui_print "  ✔ Mode: $desc"

ui_print ""
ui_print "◆ (2/5) Reboots before protection kicks in?"
ui_print ""
ui_print "   1) 1 boot    (aggressive)"
ui_print "   2) 2 boots   (recommended)"
ui_print "   3) 3 boots   (balanced)"
ui_print "   4) 4 boots   (relaxed)"
ui_print ""
ui_print "  [Vol+ = Select | Vol- = Next]"

menu_cur=1
while true; do
  ui_print "  ► Option $menu_cur"
  chooseport 8
  key=$?
  [ "$key" -eq 0 ] && break
  menu_cur=$((menu_cur % 4 + 1))
done
selected_threshold=$menu_cur
modify_prop -s "threshold" "$selected_threshold"
ui_print "  ✔ Threshold: $selected_threshold boot(s)"

ui_print ""
ui_print "◆ (3/5) Also protect service.d / post-mount.d scripts?"
ui_print ""
ui_print "  [Vol+ = YES | Vol- = NO]"
chooseport 8
key=$?
if [ "$key" -eq 0 ]; then
  monitor_scripts="true"
  ui_print "  ✔ Boot scripts (.d): ENABLED"
else
  monitor_scripts="false"
  ui_print "  ✘ Boot scripts (.d): DISABLED"
fi
modify_prop -s "monitor_scripts" "$monitor_scripts"

ui_print ""
ui_print "◆ (4/5) Extra daemon checks (vold, servicemanager)?"
ui_print ""
ui_print "  [Vol+ = YES | Vol- = NO]"
chooseport 8
key=$?
if [ "$key" -eq 0 ]; then
  stability_check="true"
  ui_print "  ✔ Extra stability checks: ENABLED"
else
  stability_check="false"
  ui_print "  ✘ Extra stability checks: DISABLED"
fi
modify_prop -s "extra_stability" "$stability_check"

backup_status="Skipped"
ui_print ""
ui_print "◆ (5/5) Backup important partitions before setup?"
ui_print ""
ui_print "  Backs up any supported partition your device has into a"
ui_print "  zip with a SHA256 checksum file. Safety net, not a full"
ui_print "  backup. Skip this if you already have one."
ui_print ""
ui_print "  ⚠ May contain IMEI/calibration data."
ui_print "  Do not share or upload it. Keep it private."
ui_print ""
ui_print "  [Vol+ = YES | Vol- = NO, I already have one]"
chooseport 30
key=$?
if [ "$key" -eq 0 ]; then
  ui_print ""
  ui_print "  ✔ Starting partition backup..."

  BYNAME=""
  for candidate in /dev/block/by-name /dev/block/*/by-name /dev/block/*/*/by-name; do
    if [ -d "$candidate" ]; then
      BYNAME="$candidate"
      break
    fi
  done

  BACKUP_DIR="/sdcard/Download"
  WORK="$TMPDIR/ash_partbackup"
  PLAN="$WORK/plan.txt"

  ACTIVE_SLOT_SFX=$(getprop ro.boot.slot_suffix 2>/dev/null | sed -e 's/^_//' -e 's/^slot_//')
  if [ -n "$ACTIVE_SLOT_SFX" ]; then
    ui_print "  • Backing up from active slot: ${ACTIVE_SLOT_SFX}"
  fi

  rm -rf "$WORK"

  if [ -z "$BYNAME" ]; then
    ui_print "  ✘ Could not locate by-name partition directory. Skipping backup."
    backup_status="Failed: by-name dir not found"
  elif ! mkdir -p "$BACKUP_DIR" 2>/dev/null || [ ! -w "$BACKUP_DIR" ]; then
    ui_print "  ✘ $BACKUP_DIR is not writable here. Skipping backup."
    backup_status="Failed: backup dir not writable"
  elif ! mkdir -p "$WORK" 2>/dev/null; then
    ui_print "  ✘ Could not create temp workspace. Skipping backup."
    backup_status="Failed: temp dir"
  elif ! sha_run "$0" >/dev/null 2>&1 && ! sha_run /dev/null >/dev/null 2>&1; then
    ui_print "  ✘ sha256sum not available. Skipping backup."
    backup_status="Failed: no sha256sum"
    rm -rf "$WORK"
  else
    PARTITION_LIST="nvram nvdata nvcfg pro_info nvcarmd persist persistbak protect1 protect2 efs modemst1 modemst2:fsg fsc mfg oplusreserve3:opporeserve3 oplusreserve2:opporeserve2 oplusreserve1:opporeserve1"

    total_bytes=0
    : > "$PLAN"
    for entry in $PARTITION_LIST; do
      name="${entry%%:*}"
      if [ "$name" = "$entry" ]; then
        aliases=""
      else
        aliases=$(echo "${entry#*:}" | tr ',' ' ')
      fi

      src=""
      found_as=""
      for candidate in "$name" $aliases; do
        if [ -e "$BYNAME/$candidate" ]; then
          src="$BYNAME/$candidate"
          found_as="$candidate"
          break
        fi
      done
      if [ -z "$src" ] && [ -n "$ACTIVE_SLOT_SFX" ]; then
        if [ -e "$BYNAME/${name}${ACTIVE_SLOT_SFX}" ]; then
          src="$BYNAME/${name}${ACTIVE_SLOT_SFX}"
          found_as="${name}${ACTIVE_SLOT_SFX}"
        fi
      fi
      [ -z "$src" ] && continue

      psize=$(get_part_size "$src")
      total_bytes=$((total_bytes + psize))
      echo "$name|$src|$found_as|$psize" >> "$PLAN"
    done

    if [ ! -s "$PLAN" ]; then
      ui_print "  ✘ No known partitions found on this device. Nothing backed up."
      backup_status="Failed: no matching partitions"
    else
      need_kb=$(( (total_bytes / 1024) + 1024 ))
      tmp_avail=$(get_avail_kb "$TMPDIR")
      out_avail=$(get_avail_kb "$BACKUP_DIR")

      if { [ -n "$tmp_avail" ] && [ "$tmp_avail" -lt "$need_kb" ]; } || \
         { [ -n "$out_avail" ] && [ "$out_avail" -lt "$need_kb" ]; }; then
        ui_print "  ✘ Not enough free space (need ~$((need_kb / 1024)) MB in temp and in $BACKUP_DIR)."
        backup_status="Failed: not enough space"
      else
        backed_up=0
        : > "$WORK/sha256sums.txt"

        while IFS='|' read -r name src found_as psize; do
          img="$WORK/$name.img"
          ui_print "  - Backing up $name (as $found_as)..."

          if ! dd if="$src" of="$img" bs=4M 2>/dev/null; then
            ui_print "    ! Failed, skipping"
            rm -f "$img"
            continue
          fi

          if [ ! -s "$img" ]; then
            ui_print "    ! Backup is empty, skipping"
            rm -f "$img"
            continue
          fi

          img_size=$(wc -c < "$img" 2>/dev/null)
          if [ "$psize" -gt 0 ] && [ "$img_size" != "$psize" ]; then
            ui_print "    ! Size mismatch ($img_size vs $psize), skipping"
            rm -f "$img"
            continue
          fi

          if ! (cd "$WORK" && sha_run "$name.img" | awk '{if(NF==2){print $2": "$1}else{print}}' >> sha256sums.txt); then
            ui_print "    ! Checksum failed, skipping"
            rm -f "$img"
            continue
          fi

          backed_up=$((backed_up + 1))
        done < "$PLAN"

        if [ "$backed_up" -eq 0 ]; then
          ui_print "  ✘ No partitions could be backed up."
          backup_status="Failed: all dumps failed"
        else
          SAFE_TAG=$(echo "${BRAND}_${MODEL}_${DEVICE}" | tr -cs 'A-Za-z0-9_-' '_')
          SAFE_TAG=$(printf '%s' "$SAFE_TAG" | sed -e 's/_*$//' -e 's/^_*//')
          [ -z "$SAFE_TAG" ] && SAFE_TAG="Backup"
          ZIP_NAME="AshReXcue-Partitions-${SAFE_TAG}.zip"

          if [ -e "$BACKUP_DIR/$ZIP_NAME" ]; then
            n=2
            while [ -e "$BACKUP_DIR/AshReXcue-Partitions-${SAFE_TAG}-$n.zip" ]; do
              n=$((n + 1))
            done
            ZIP_NAME="AshReXcue-Partitions-${SAFE_TAG}-$n.zip"
          fi

          METADATA="$WORK/backup_info.txt"
          printf '%s\n' "===================================" "AshReXcue Partition Backup" "Created   : $(date '+%Y-%m-%d %H:%M:%S')" "Device    : $BRAND $MODEL ($DEVICE)" "Root      : $method" "Root Ver  : $ROOT_VERSION" "Module Ver: $MODVER ($MODVCODE)" "===================================" "" > "$METADATA" && cat "$WORK/sha256sums.txt" >> "$METADATA" && mv -f "$METADATA" "$WORK/sha256sums.txt"

          if (cd "$WORK" && "$ZIP_BIN" -r "$BACKUP_DIR/$ZIP_NAME" ./*.img sha256sums.txt >/dev/null 2>&1) && [ -s "$BACKUP_DIR/$ZIP_NAME" ]; then
            backup_status="Saved"
            ui_print "  ✔ Saved $backed_up partition(s): $ZIP_NAME"
            ui_print "  ✔ Location: $BACKUP_DIR"
            ui_print "  ✔ sha256sums.txt includes backup info & hashes"
            ui_print "  ⚠ Keep this file private move it to your own cloud too."
          else
            rm -f "$BACKUP_DIR/$ZIP_NAME"
            ui_print "  ✘ Failed to create backup ZIP."
            backup_status="Failed: ZIP creation"
          fi
        fi
      fi
    fi
    rm -rf "$WORK"
  fi
else
  ui_print "  ✘ Skipped partition backup."
fi

restored_config="defaults"
if [ -f "$mdir/AshLooper/settings.prop" ]; then
  oldlog=$(get_prop log "$mdir/AshLooper/settings.prop")
  ui_print ""
  ui_print "  ◆ Previous installation detected."
  ui_print ""
  ui_print "◆ Restore old whitelist & stability time?"
  ui_print ""
  ui_print "  [Vol+ = YES | Vol- = NO]"
  chooseport 8
  key=$?
  if [ "$key" -eq 0 ]; then
    [ -n "$oldlog" ] && modify_prop -s "log" "$oldlog" "$MODPATH/settings.prop"
    oldlist=$(get_prop whitelist "$mdir/AshLooper/settings.prop") && modify_prop -s "whitelist" "$oldlist" "$MODPATH/settings.prop"
    old_stab=$(get_prop stability_time "$mdir/AshLooper/settings.prop") && modify_prop -s "stability_time" "$old_stab" "$MODPATH/settings.prop"
    restored_config="restored"
    ui_print "  ✔ Previous config restored"
  else
    ui_print "  ✔ Using fresh defaults"
  fi
fi

ui_print ""
ui_print "- Writing config..."

stability_display=$([ "$stability_check" = "true" ] && echo "On" || echo "Off")
scripts_display=$([ "$monitor_scripts" = "true" ] && echo "On" || echo "Off")
modify_prop -s "description" "🔰 [Mode $smode | Threshold: $selected_threshold boots | Stability Check: $stability_display | Scripts (.d): $scripts_display] Your safety net for bad modules. Catches boot loops, disables the culprits." "$MODPATH/module.prop"
mkdir -p "$LOG_DIR" || { ui_print "- Error: Failed to create '$LOG_DIR'. Aborting." >&2; exit 1; }

rm -f "$ZIP_BIN"

install_date=$(date '+%Y-%m-%d' 2>/dev/null || echo "unknown")
modify_prop -s "install_date" "$install_date" "$MODPATH/settings.prop"

ui_print ""
ui_print "  ================================"
ui_print "         SETUP COMPLETE"
ui_print "  ================================"
ui_print "   Mode       : $desc"
ui_print "   Threshold  : $selected_threshold boot(s)"
ui_print "   Scripts(.d): $scripts_display"
ui_print "   Stability  : $stability_display"
ui_print "   Config     : $restored_config"
ui_print "   Backup     : $backup_status"
ui_print "   Logs Path  : $LOG_DIR"
ui_print "  ================================"
ui_print ""
ui_print "  ⚡ Reboot to activate protection."
ui_print ""