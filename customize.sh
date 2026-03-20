
. "$MODPATH/utils.sh" || { echo "! Failed to load utils.sh"; abort; }

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
  1) smode="DM"; desc="Disable Modules" ;;
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
ui_print " STEP 3 : Calibration"
ui_print "=================================================="
ui_print "- Checking system services..."

if pgrep -x system_server >/dev/null 2>&1 || pidof system_server >/dev/null 2>&1; then
  found_ss="true"
  ui_print "- system_server found"
else
  found_ss="false"
  ui_print "- system_server missing"
fi

if pgrep -x surfaceflinger >/dev/null 2>&1 || pidof surfaceflinger >/dev/null 2>&1; then
  found_sf="true"
  ui_print "- surfaceflinger found"
else
  found_sf="false"
  ui_print "- surfaceflinger missing"
fi

sleep 0.5
modify_prop -s "check_ss" "$found_ss"
modify_prop -s "check_sf" "$found_sf"

stability_check="false"

if [ "$found_ss" = "true" ] && [ "$found_sf" = "true" ]; then
  ui_print ""
  ui_print "=================================================="
  ui_print " STEP 4 : Advanced Monitor"
  ui_print "=================================================="
  ui_print "- Enable extra stability checks?"
  ui_print "  [ Vol+ = YES ]  [ Vol- = NO ]"
  ui_print ""

  if chooseport; then
    stability_check="true"
    ui_print "- Extra Stability: ENABLED"
  else
    stability_check="false"
    ui_print "- Extra Stability: DISABLED"
  fi
else
  ui_print ""
  ui_print "- Services missing: Skipping Advanced Monitor"
fi

modify_prop -s "extra_stability" "$stability_check"

ui_print ""
ui_print "--------------------------------------------------"
ui_print "- Writing Config..."

oldlog=$(get_prop log "$mdir/AshLooper/settings.prop") && modify_prop -s "log" "$oldlog" "$MODPATH/settings.prop"
oldlist=$(get_prop whitelist "$mdir/AshLooper/settings.prop") && modify_prop -s "whitelist" "$oldlist" "$MODPATH/settings.prop"

modify_prop -s "description" "🛡️ [Mode $smode | Threshold: $selected_threshold boots | Stability Check: $stability_check] Bootloop Saver Protection For Magisk-KernelSU/Next." "$MODPATH/module.prop"
mkdir -p "$LOG_DIR" || { ui_print "- Error: Failed to create directory '$LOG_DIR'. Aborting." >&2; exit 1; }

[ -f "$JQ" ] && chmod 755 "$JQ"

install_date=$(date '+%Y-%m-%d' 2>/dev/null || echo "unknown")
modify_prop -s "install_date" "$install_date" "$MODPATH/settings.prop"

ui_print ""
ui_print "- Reboot to apply protection."
ui_print ""