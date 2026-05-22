. "$MODPATH/utils.sh" || { echo "! Failed to load utils.sh"; abort; }

if [ -f "/data/adb/modules/AshLooper/module.prop" ] && awk -v ver="$(get_prop "version" "/data/adb/modules/AshLooper/module.prop")" 'BEGIN { exit (ver < 9.7 ? 0 : 1) }'; then
    ui_print "- Please uninstall the existing AshLooper module first."
    ui_print "- We modified the log system. Clean installation is required."
    abort "- Installation aborted"
fi

MODVER=$(grep_prop version "$TMPDIR/module.prop")
AUTHOR=$(grep_prop author "$TMPDIR/module.prop")
DEVICE=$(getprop ro.product.device)
MODEL=$(getprop ro.product.model)
BRAND=$(getprop ro.product.brand)
ROOT_VERSION=$(get_root_version)

ui_print "- AshReXcue bootloop protection"
ui_print "- Device: $BRAND $MODEL"
ui_print "- Root: $method"
ui_print "- Root Version: $ROOT_VERSION"
ui_print ""
ui_print "- Initializing..."
sleep 0.5

ui_print ""
ui_print "=================================================="
ui_print " STEP 1 : Protection Mode"
ui_print "=================================================="
ui_print "- Available Options:"
ui_print "  1. Standard (Disable Modules Only)"
ui_print "  2. Nuclear  (Disable + Reboot Recovery)"
ui_print ""
ui_print "- Usage:"
ui_print "  [ Vol+ = Select Current ]  [ Vol- = Skip to Next ]"
ui_print ""

selected_mode=""
while [ -z "$selected_mode" ]; do
    for mode in 1 2; do
        ui_print "  > Select Mode $mode?"
        if chooseport; then
            selected_mode="$mode"
            break
        else
            ui_print "    Skipping..."
        fi
    done
    if [ -z "$selected_mode" ]; then
        ui_print "  ! Selection required. Retrying..."
        sleep 1
        ui_print ""
    fi
done

case "$selected_mode" in
    1) smode="DM";  desc="Disable Modules" ;;
    2) smode="DMR"; desc="Disable + Recovery" ;;
esac

modify_prop -s "mode" "$selected_mode"
ui_print "  ✔ Selected: $desc"

ui_print ""
ui_print "=================================================="
ui_print " STEP 2 : Trigger Threshold"
ui_print "=================================================="
ui_print "- How many failed boots trigger protection?"
ui_print "- Available Options:"
ui_print "  1. 1 Boot  (Aggressive)"
ui_print "  2. 2 Boots (Recommended)"
ui_print "  3. 3 Boots (Balanced)"
ui_print "  4. 4 Boots (Relaxed)"
ui_print ""

selected_threshold=""
while [ -z "$selected_threshold" ]; do
    for t in 1 2 3 4; do
        ui_print "  > Select Threshold: $t Boot(s)?"
        if chooseport; then
            selected_threshold="$t"
            break
        else
            ui_print "    Skipping..."
        fi
    done
    if [ -z "$selected_threshold" ]; then
        ui_print "  ! Selection required. Retrying..."
        sleep 1
        ui_print ""
    fi
done

modify_prop -s "threshold" "$selected_threshold"
ui_print "  ✔ Set to: $selected_threshold boot(s)"

ui_print ""
ui_print "=================================================="
ui_print " STEP 3 : Stability Monitor"
ui_print "=================================================="
ui_print "- SystemUI crash monitoring is always active."
ui_print "- Enable EXTRA daemon checks (vold, servicemanager)?"
ui_print "  [ Vol+ = YES ]  [ Vol- = NO ]"
ui_print ""

if chooseport; then
    stability_check="true"
    ui_print "- Extra Stability: ENABLED"
else
    stability_check="false"
    ui_print "- Extra Stability: DISABLED"
fi

modify_prop -s "extra_stability" "$stability_check"

ui_print ""
ui_print "--------------------------------------------------"
ui_print "- Writing Config..."

if [ -f "$mdir/AshLooper/settings.prop" ]; then
  oldlog=$(get_prop log "$mdir/AshLooper/settings.prop") && modify_prop -s "log" "$oldlog" "$MODPATH/settings.prop"
  ui_print ""
  ui_print "=================================================="
  ui_print " STEP 4 : Restore Configuration"
  ui_print "=================================================="
  ui_print "- Found previous settings (Whitelist, Stability Time)."
  ui_print "- Do you want to restore them?"
  ui_print "  [ Vol+ = YES ]  [ Vol- = NO ]"
  ui_print ""

  if chooseport; then
    ui_print "  ✔ Restoring old configuration..."
    oldlist=$(get_prop whitelist "$mdir/AshLooper/settings.prop") && modify_prop -s "whitelist" "$oldlist" "$MODPATH/settings.prop"
    old_stab=$(get_prop stability_time "$mdir/AshLooper/settings.prop") && modify_prop -s "stability_time" "$old_stab" "$MODPATH/settings.prop"
  else
    ui_print "  ✔ Skipping restore. Using defaults."
  fi
fi

modify_prop -s "description" "🛡️ [Mode $smode | Threshold: $selected_threshold boots | Stability Check: $stability_check] Bootloop Saver Protection For Magisk-KernelSU/Next." "$MODPATH/module.prop"
mkdir -p "$LOG_DIR" || { ui_print "- Error: Failed to create directory '$LOG_DIR'. Aborting." >&2; exit 1; }

[ -f "$JQ" ] && chmod 755 "$JQ"

install_date=$(date '+%Y-%m-%d' 2>/dev/null || echo "unknown")
modify_prop -s "install_date" "$install_date" "$MODPATH/settings.prop"

ui_print ""
ui_print "- Reboot to apply protection."
ui_print ""