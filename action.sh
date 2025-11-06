#!/system/bin/sh

MODPATH=$(dirname "$0")
. "$MODPATH/func.sh" || { echo "Error: Failed to source func.sh"; exit 1; }

echo ""
echo "» 🛡️  AshLooper Bootloop Protection"
echo "» ⏳ Initializing bootloop protection..."
echo ""

echo "» 🎯 STEP 1: PROTECTION MODE"
echo "  Vol+ = Confirm │ Vol- = Switch"
echo "  Use Volume Keys to select your preference:"
echo ""
echo "  ❶ Disable Modules (Default)"
echo "  ❷ Disable Modules & Reboot to Recovery"
echo ""

selected_mode=""

for mode in 1 2; do
    if [ "$mode" -eq 1 ]; then
        current_option="Disable Modules"
    else
        current_option="Disable Modules & Reboot Recovery"
    fi
    echo "  ▸ $current_option"
    chooseport && selected_mode="$mode" && break
done

[ -z "$selected_mode" ] && { echo "  ✘ No mode selected. Installation aborted."; exit 1; }

case "$selected_mode" in
    1) smode="DM"; desc="Disable Module Mode" ;;
    2) smode="DMR"; desc="Disable & Reboot Recovery Mode" ;;
esac

echo ""
echo "» ✓ SELECTED MODE » $desc"
echo ""
modify_prop "mode" "$selected_mode"
sleep 1

echo "» 🎯 STEP 2: LOOP THRESHOLD"
echo "  Vol+ = Confirm │ Vol- = Switch"
echo "  How many failed boots should trigger protection?"
echo "  (Recommended: 2)"
echo ""

threshold_list="1 2 3 4"
selected_threshold=""
for threshold in $threshold_list; do
    echo "  ▸ $threshold Failed Boot$([ $threshold -eq 1 ] && echo "" || echo "s")"
    chooseport && selected_threshold="$threshold" && break
done

[ -z "$selected_threshold" ] && { echo "  ✘ No threshold selected. Installation aborted."; exit 1; }

echo ""
echo "» ✓ THRESHOLD SET » Trigger Protection After: $selected_threshold Boot$([ $selected_threshold -eq 1 ] && echo "" || echo "s")"
echo ""
modify_prop "threshold" "$selected_threshold"
sleep 1

echo "» ⚡ FINALIZING INSTALLATION"
echo ""

echo "  ▸ Updating module description..."
update_description "[$smode · $selected_threshold boots] Advanced boot loop protection for Magisk-KernelSU/Next."
sleep 1
echo "  ✓ Done"
echo ""

echo "» 🎉 INSTALLATION COMPLETE"
echo " •  Your device is now protected against boot loops."
echo " •  Module is ready to use!"
echo ""