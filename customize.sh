#!/sbin/sh

# Define the path to the module
MODULE_PATH="/data/adb/modules/AshLooper"
KSU_PATH="/data/adb/ksu/modules.img"


if [ -f "/data/adb/ksud" ]; then
           ui_print "- KSU detected, Installing The Module..."
           if [ -d "$MODULE_PATH" ]; then
            rm -rf "$KSU_PATH"
            ui_print "- Module already exists. Removing..."
           fi
    elif [ -f "/data/adb/magisk/magiskboot" ]; then
            ui_print "- Magisk detected, Installing The Module..."
           if [ -d "$MODULE_PATH" ]; then
            rm -rf "$MODULE_PATH"
            ui_print "- Module already exists. Removing..."
           fi
fi
        
ui_print "- Flashing AshLooper module..."

ui_print "- they..."
ui_print "- they wants us to suffer..."