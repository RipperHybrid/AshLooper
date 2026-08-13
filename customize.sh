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
ui_print ""
ui_print "- Initializing..."
sleep 0.5

ui_print ""
ui_print ">>> STEP 1 : Protection Mode"
ui_print "  1. Standard (Disable Modules)"
ui_print "  2. Nuclear  (Disable + Recovery)"
ui_print "  [Vol+ = Select] [Vol- = Next]"
ui_print ""

selected_mode=""
while [ -z "$selected_mode" ]; do
    for mode in 1 2; do
        ui_print "  > Mode $mode?"
        if chooseport; then
            selected_mode="$mode"
            break
        fi
    done
    if [ -z "$selected_mode" ]; then
        ui_print "  ! Retry selection..."
        sleep 1
        ui_print ""
    fi
done

case "$selected_mode" in
    1) smode="DM";  desc="Disable Modules" ;;
    2) smode="DMR"; desc="Disable + Recovery" ;;
esac

modify_prop -s "mode" "$selected_mode"
ui_print "  ✔ $desc"

ui_print ""
ui_print ">>> STEP 2 : Trigger Threshold"
ui_print "  1 Boot  (Aggressive)"
ui_print "  2 Boots (Recommended)"
ui_print "  3 Boots (Balanced)"
ui_print "  4 Boots (Relaxed)"
ui_print ""

selected_threshold=""
while [ -z "$selected_threshold" ]; do
    for t in 1 2 3 4; do
        ui_print "  > Threshold $t?"
        if chooseport; then
            selected_threshold="$t"
            break
        fi
    done
    if [ -z "$selected_threshold" ]; then
        ui_print "  ! Retry selection..."
        sleep 1
        ui_print ""
    fi
done

modify_prop -s "threshold" "$selected_threshold"
ui_print "  ✔ $selected_threshold boot(s)"

ui_print ""
ui_print ">>> STEP 3 : Script Monitoring"
ui_print "- Protect service.d / post-mount.d?"
ui_print "  [Vol+ = YES] [Vol- = NO]"
ui_print ""

if chooseport; then
    monitor_scripts="true"
    ui_print "  ✔ Monitoring ENABLED"
else
    monitor_scripts="false"
    ui_print "  ✔ Monitoring DISABLED"
fi

modify_prop -s "monitor_scripts" "$monitor_scripts"

ui_print ""
ui_print ">>> STEP 4 : Stability Monitor"
ui_print "- Extra daemon checks (vold, servicemanager)?"
ui_print "  [Vol+ = YES] [Vol- = NO]"
ui_print ""

if chooseport; then
    stability_check="true"
    ui_print "  ✔ Extra checks ENABLED"
else
    stability_check="false"
    ui_print "  ✔ Extra checks DISABLED"
fi

modify_prop -s "extra_stability" "$stability_check"

ui_print ""
ui_print "- Writing config..."

if [ -f "$mdir/AshLooper/settings.prop" ]; then
  oldlog=$(get_prop log "$mdir/AshLooper/settings.prop") && modify_prop -s "log" "$oldlog" "$MODPATH/settings.prop"
  ui_print ""
  ui_print ">>> STEP 5 : Restore Config"
  ui_print "- Restore old whitelist/stability time?"
  ui_print "  [Vol+ = YES] [Vol- = NO]"
  ui_print ""

  if chooseport; then
    ui_print "  ✔ Restoring..."
    oldlist=$(get_prop whitelist "$mdir/AshLooper/settings.prop") && modify_prop -s "whitelist" "$oldlist" "$MODPATH/settings.prop"
    old_stab=$(get_prop stability_time "$mdir/AshLooper/settings.prop") && modify_prop -s "stability_time" "$old_stab" "$MODPATH/settings.prop"
  else
    ui_print "  ✔ Using defaults"
  fi
fi

stability_display=$([ "$stability_check" = "true" ] && echo "On" || echo "Off")
scripts_display=$([ "$monitor_scripts" = "true" ] && echo "On" || echo "Off")
modify_prop -s "description" "🛡️ [Mode $smode | Threshold: $selected_threshold boots | Stability Check: $stability_display | Boot Scripts (.d): $scripts_display] Bootloop Saver Protection For Magisk-KernelSU/Next." "$MODPATH/module.prop"
mkdir -p "$LOG_DIR" || { ui_print "- Error: Failed to create '$LOG_DIR'. Aborting." >&2; exit 1; }

[ -f "$JQ" ] && chmod 755 "$JQ"

install_date=$(date '+%Y-%m-%d' 2>/dev/null || echo "unknown")
modify_prop -s "install_date" "$install_date" "$MODPATH/settings.prop"

ui_print ""
ui_print "- Reboot to apply protection."
ui_print ""