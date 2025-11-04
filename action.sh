#!/system/bin/sh

MODPATH=$(dirname "$0")
. "$MODPATH/func.sh" || { echo "Error: Failed to source func.sh"; exit 1; }

LINE="──────────────────────────────────────────"
TL="╔${LINE}╗"
BL="╚${LINE}╝"
SP="  "

echo " $TL"
echo " ║ $SP 🔧  Step 1: Select Protection Mode"
echo " ║ $LINE"
echo " ║ $SP Please use Volume Keys to choose:"
echo " ║ $SP"
echo " ║ $SP   [1] Disable Modules (Default)"
echo " ║ $SP   [2] Disable Modules & Reboot to Recovery"
echo " ║ $SP"
echo " ║ $SP (Vol+ to Confirm, Vol- to Switch)"
echo " $BL"
echo ""

selected_mode=""

for mode in 1 2; do
    if [ "$mode" -eq 1 ]; then
        current_option="Disable Modules"
    else
        current_option="Disable Modules & Reboot Recovery"
    fi
    echo " $SP > Selecting: [$current_option]"
    chooseport && selected_mode="$mode" && break
done

[ -z "$selected_mode" ] && { echo " $SP ❌ No mode selected, aborting."; exit 1; }

case "$selected_mode" in
    1) smode="DM"; desc="Disable Module Mode" ;;
    2) smode="DMR"; desc="Disable & Reboot Recovery Mode" ;;
esac
echo " $SP ✅ Selected Mode: $desc"
modify_prop "mode" "$selected_mode"
echo ""
sleep 1

echo " $TL"
echo " ║ $SP 🎯  Step 2: Select Loop Threshold"
echo " ║ $LINE"
echo " ║ $SP How many failed boots should trigger protection?"
echo " ║ $SP (Recommended is 2)"
echo " ║ $SP"
echo " ║ $SP (Vol+ to Confirm, Vol- to Switch)"
echo " $BL"
echo ""

threshold_list="1 2 3 4"
selected_threshold=""
for threshold in $threshold_list; do
    echo " $SP > Selecting: [$threshold Failed Boots]"
    chooseport && selected_threshold="$threshold" && break
done

[ -z "$selected_threshold" ] && { echo " $SP ❌ No threshold selected, aborting."; exit 1; }

echo " $SP ✅ Selected Threshold: $selected_threshold"
modify_prop "threshold" "$selected_threshold"
echo ""
sleep 1

echo " $TL"
echo " ║ $SP ⏳  Finalizing Installation"
echo " ║ $LINE"
echo " ║ $SP - Updating module description..."
update_description "[$smode · $selected_threshold boots] AshLooper: Bootloop protection. Disables modules on failure."
sleep 1
echo " ║ $SP [DONE]"

echo " ║ $LINE"
echo " ║ $SP 🎉  Setup Complete!  🎉"
echo " $BL"
echo ""
