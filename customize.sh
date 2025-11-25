# AshReXcue customize Logic - Don't modify anything after this - By AshBorn (@Ripper_Hybrid)

. "$MODPATH"/func.sh || { ui_print "Error: Failed to source func.sh"; exit 1; }

MODNAME=$(grep_prop name "$TMPDIR/module.prop")
MODVER=$(grep_prop version "$TMPDIR/module.prop")
AUTHOR=$(grep_prop author "$TMPDIR/module.prop")
DEVICE=$(getprop ro.product.device)
MODEL=$(getprop ro.product.model)
BRAND=$(getprop ro.product.brand)

ui_print ""
ui_print "» 🛡️  $MODNAME v$MODVER"
ui_print ""

ui_print "» 📋 SYSTEM INFORMATION"
ui_print ""
ui_print "  👤 Author: $AUTHOR"
ui_print "  📱 Device: $BRAND $MODEL ($DEVICE)"
ui_print "  ⚙️  Root: $method"
ui_print ""
ui_print "  ⏳ Initializing bootloop protection..."
ui_print ""

ui_print "» 🎯 STEP 1: PROTECTION MODE"
ui_print "  Vol+ = Confirm │ Vol- = Switch"
ui_print "  Use Volume Keys to select your preference:"
ui_print ""
ui_print "  ❶ Disable Modules (Default)"
ui_print "  ❷ Disable Modules & Reboot to Recovery"
ui_print ""

selected_mode=""

for mode in 1 2; do
    if [ "$mode" -eq 1 ]; then
        current_option="Disable Modules"
    else
        current_option="Disable Modules & Reboot Recovery"
    fi
    ui_print "  ▸ $current_option"
    chooseport && selected_mode="$mode" && break
done

[ -z "$selected_mode" ] && { ui_print "  ✘ No mode selected. Installation aborted."; abort; }

case "$selected_mode" in
    1) smode="DM"; desc="Disable Module Mode" ;;
    2) smode="DMR"; desc="Disable & Reboot Recovery Mode" ;;
esac

ui_print ""
ui_print "» ✓ SELECTED MODE » $desc"
ui_print ""
modify_prop "mode" "$selected_mode"
sleep 1

ui_print "» 🎯 STEP 2: LOOP THRESHOLD"
ui_print "  Vol+ = Confirm │ Vol- = Switch"
ui_print "  How many failed boots should trigger protection?"
ui_print "  (Recommended: 2)"
ui_print ""

threshold_list="1 2 3 4"
selected_threshold=""
for threshold in $threshold_list; do
    ui_print "  ▸ $threshold Failed Boot$([ $threshold -eq 1 ] && echo "" || echo "s")"
    chooseport && selected_threshold="$threshold" && break
done

[ -z "$selected_threshold" ] && { ui_print "  ✘ No threshold selected. Installation aborted."; abort; }

ui_print ""
ui_print "» ✓ THRESHOLD SET » Trigger Protection After: $selected_threshold Boot$([ $selected_threshold -eq 1 ] && echo "" || echo "s")"
ui_print ""
modify_prop "threshold" "$selected_threshold"
sleep 1

ui_print "» ⚡ Finalizing Installation"
ui_print ""

ui_print "  ▸ post-fs-data.sh"
ui_print "  ▸ service.sh"
sleep 1
ui_print "  ✓ Ready"
ui_print ""

ui_print "  ▸ Updating module description..."
update_description "[$smode · $selected_threshold boots] Advanced boot loop protection for Magisk-KernelSU/Next."
sleep 1
ui_print "  ✓ Done"
ui_print ""
[ -f "$JQ" ] && chmod 755 "$JQ"
ui_print "» 🎉 INSTALLATION COMPLETE"
ui_print " •  Your device is now protected against boot loops."
ui_print " •  Module is ready to use!"