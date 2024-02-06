# AshLooper Module Management - Don't modify anything after this - By Ꭺsʜʙᴏʀɴ 々 (@Ripper_Hybrid)

sysboot=$(getprop sys.boot_completed)

if [ "$sysboot" = 1 ]; then
    arg1="$1"
    arg2="$2"
    my_magisk_installer=true
    type flash_image &>$(dirname $arg3)/log.txt || flash_image() { dd if="$1" of="$2"; }
    ui_print "Umm Wtf!!!"
    abort
else
    arg1="$1"
    arg2="$2"
    arg3="$3"
    my_magisk_installer=false
    type flash_image || flash_image() { dd if="$1" of="$2"; }
    ui_print() { echo -e "ui_print "$1"\nui_print" >>"/proc/self/fd/$arg2"; }
fi

abort() {
  ui_print "$1"
  [ ! -z $MODPATH ] && rm -rf $MODPATH
  rm -rf $TMPDIR
  exit 0
}

mount_ksu_modules() {
    max_retries=3
    retries=0
    while [ $retries -lt $max_retries ]; do
        if $bb mount -t auto -o loop /data/adb/ksu/modules.img /data/adb/modules/; then
            logger "  >[Modules mounted successfully.]< "
            return 0
        else
            logger "  >[Failed to mount modules. Retrying..]< "
            ((retries++))
            sleep 1
        fi
    done
    logger "  >[Failed to mount modules after $max_retries retries.]< "
    handle_ksu_misc
}

show_main_menu() {
    logger " "
    logger "#############################"
    logger "  >[ Let's Manage Modules ]< "
    logger "1. Disable Modules"
    logger "2. Enable Modules"
    logger "3. Remove Modules"
    logger "4. Restore Modules"
    logger "5. List Modules"
    logger "6. Exit"
    logger "#############################"
    sleep 0.5
    logger " "
}

show_disable_menu() {
        logger " "
        logger "###########################"
        logger "  >[ Disable Modules ]<    "
        logger "1. Disable all modules"
        logger "2. Disable a specific module"
        logger "3. Go to the main menu"
        logger "4. Exit"
        logger "###########################"
        logger " "
}

show_enable_menu() {
        logger " "
        logger "###########################"
        logger "  >[ Enable Modules ]<     "
        logger "1. Enable all modules"
        logger "2. Enable a specific module"
        logger "3. Go to the main menu"
        logger "4. Exit"
        logger "###########################"
        logger " "
}

show_remove_menu() {
        logger " "
        logger "###########################"
        logger "  >[ Remove Modules ]<     "
        logger "1. Remove all modules"
        logger "2. Remove a specific module"
        logger "3. Go to the main menu"
        logger "4. Exit"
        logger "###########################"
        logger " "
}

show_restore_menu() {
        logger " "
        logger "###########################"
        logger "  >[ Restore Modules ]<    "
        logger "1. Restore all modules"
        logger "2. Restore a specific module"
        logger "3. Go to the main menu"
        logger "4. Exit"
        logger "###########################"
        logger " "
}

show_misc_menu() {
    logger " "
    logger "#############################"
    logger "  >[ Let's Manage Modules ]< "
    logger "1. Remove Modules"
    logger "2. Exit"
    logger "#############################"
    sleep 0.5
    logger " "
}


show_confirm_menu() {
    logger " "
    logger "###############################"
    logger "  >[ This operation will remove all modules. ]<  "
    logger "  >[ Do you want to proceed? ]<  "
    logger "1. Yes"
    logger "2. No"
    logger "###############################"
    sleep 0.5
    logger " "
}

confirm_remove_modules() {
    while true; do
        show_confirm_menu

    selected_option=""
    for option in "1" "2"; do
        logger "  >[$option]< "
        logger " "
        if $VKSEL; then
            selected_option="$option"
            logger " "
            logger "  >[Selected $selected_option]<  "
            break
        fi
    done

    case "$selected_option" in
        "1") remove_modules_img ;;
        "2") logger "  >[Returning to previous menu...]< "; handle_ksu_misc ;;
          *) logger "  >[Invalid option. Please try again.]< " ;;
        esac
    done
}

handle_magisk() {
    if ! $bb mountpoint -q /data; then
        logger " "
        logger "  >[Data partition is not mounted.]< "
        logger "  >[Please mount data and try again.]< "
        logger "  >[Exiting Magisk operations.]< "
        abort
    else
        logger " "
        logger "  >[Data partition is mounted correctly.]< "
    fi

    while true; do
        show_main_menu

        selected_option=""
        for option in "1" "2" "3" "4" "5" "6"; do
            logger "  >[$option]< "
            logger " "
            if $VKSEL; then
                selected_option="$option"
                logger " "
                logger "  >[Selected $selected_option]<  "
                break
            fi
        done

        case "$selected_option" in
            "1") disable_modules ;;
            "2") enable_modules ;;
            "3") remove_modules ;;
            "4") restore_modules ;;
            "5") list_modules ;;
            "6") logger "  >[Exiting...]<  "; logger "  >[Script exited]< "; abort ;;
            *) logger "  >[Invalid option. Please try again.]< " ;;
        esac
    done
}

handle_ksu_misc() {
    while true; do
        show_misc_menu

        selected_option=""
        for option in "1" "2"; do
            logger "  >[$option]< "
            logger " "
            if $VKSEL; then
                selected_option="$option"
                logger " "
                logger "  >[Selected $selected_option]<  "
                break
            fi
        done

        case "$selected_option" in
            "1") confirm_remove_modules ;;
            "2") logger "  >[Exiting...]<  "; logger "  >[Script exited]< "; abort ;;
            *) logger "  >[Invalid option. Please try again.]< " ;;
        esac
    done
}

handle_ksu() {
    if ! $bb mountpoint -q /data; then
        logger " "
        logger "  >[Data partition is not mounted.]< "
        logger "  >[Please mount data and try again.]< "
        logger "  >[Exiting KSU operations.]< "
        abort
    else
        logger " "
        logger "  >[Data partition is mounted correctly.]< "
    fi

    if [ "$sysboot" != 1 ]; then
        mount_ksu_modules
    fi
        while true; do
        show_main_menu

        selected_option=""
        for option in "1" "2" "3" "4" "5" "6"; do
            logger "  >[$option]< "
            logger " "
            if $VKSEL; then
                selected_option="$option"
                logger " "
                logger "  >[Selected $selected_option]<  "
                break
            fi
        done

        case "$selected_option" in
            "1") disable_modules ;;
            "2") enable_modules ;;
            "3") remove_modules ;;
            "4") restore_modules ;;
            "5") list_modules ;;
            "6") logger "  >[Exiting...]<  "; logger "  >[Script exited]< "; abort ;;
            *) logger "  >[Invalid option. Please try again.]< " ;;
        esac
    done
}

disable_specific_module() {
    local has_modules=false
    for module in /data/adb/modules/*; do
        if [ ! -f "$module/disable" ]; then
            has_modules=true
            break
        fi
    done

    if [ "$has_modules" = true ]; then
        logger "###########################"
        logger "  >[Please select a module to disable:]< "
        logger " "
        local num_modules=0
        for module in /data/adb/modules/*; do
            if [ ! -f "$module/disable" ]; then
                num_modules=$((num_modules + 1))
                logger "  >[Module $num_modules: $(basename "$module")]< "
                if $VKSEL; then
                    touch "$module/disable"
                    logger " "
                    logger "  >[Disabled module: $(basename "$module")]<  "
                    return
                fi
            fi
        done
    fi
    
    logger " "
    logger "  >[No module available to disable. Returning to previous menu.]< "
}

remove_specific_module() {
    local has_modules=false
    for module in /data/adb/modules/*; do
        if [ -d "$module" ]; then
            has_modules=true
            break
        fi
    done

    if [ "$has_modules" = true ]; then
        logger "###########################"
        logger "  >[Please select a module to remove:]< "
        logger " "
        local num_modules=0
        for module in /data/adb/modules/*; do
            if [ -d "$module" ]; then
                num_modules=$((num_modules + 1))
                logger "  >[Module $num_modules: $(basename "$module")]< "
                if $VKSEL; then
                    touch "$module/remove"
                    logger " "
                    logger "  >[Removed module: $(basename "$module")]<  "
                    return
                fi
            fi
        done
    fi
    
    logger " "
    logger "  >[No module available to remove. Returning to previous menu.]< "
}

restore_specific_module() {
    logger "###########################"
    logger "  >[Please select a module to restore:]< "
    logger " "
    local num_removed_modules=0
    for module in /data/adb/modules/*; do
        if [ -f "$module/remove" ]; then
            num_removed_modules=$((num_removed_modules + 1))
            logger "  >[Removed Module $num_removed_modules: $(basename "$module")]< "
            if $VKSEL; then
                rm "$module/remove"
                logger " "
                logger "  >[Restored module: $(basename "$module")]<  "
                return
            fi
        fi
    done
    
    if [ "$num_removed_modules" -eq 0 ]; then
        logger " "
        logger "  >[No modules available to restore. Returning to previous menu.]< "
    fi
}

disable_modules() {
    while true; do
        show_disable_menu
        
        selected_option=""
        for option in "1" "2" "3" "4"; do
            logger "  >[$option]< "
            logger " "
            if $VKSEL; then
                selected_option="$option"
                logger " "
                logger "  >[Selected $selected_option]<  "
                break
            fi
        done

        case "$selected_option" in
            "1") 
                logger " "
                logger "###########################"
                logger "  >[Disabling Modules Please Wait.....]<  "
                logger " "
                enabled_modules=0
                for module_folder in /data/adb/modules/*; do
                    if [ -d "$module_folder" ]; then
                        touch "$module_folder/disable"
                        logger "  >[Disabled module: $(basename "$module_folder")]<  "
                        sleep 0.6
                        enabled_modules=$((enabled_modules + 1))
                    fi
                done
                logger " "
                logger "  >[Total Disabled: $enabled_modules Modules]<  "
                logger "###########################"
                return ;;
            "2") disable_specific_module ;;
            "3") return ;;
            "4") logger "  >[Exiting...]<  "; logger "  >[Script exited]<  "; abort ;;
             *) logger "  >[Invalid option. Please try again.]<  " ;;
        esac
    done
}

enable_module() {
    local has_modules=false
    for module in /data/adb/modules/*; do
        if [ -f "$module/disable" ]; then
            has_modules=true
            break
        fi
    done

    if [ "$has_modules" = true ]; then
        logger "###########################"
        logger "  >[Please select a module to enable:]< "
        logger " "
        local num_modules=0
        for module in /data/adb/modules/*; do
            if [ -f "$module/disable" ]; then
                num_modules=$((num_modules + 1))
                logger "  >[Module $num_modules: $(basename "$module")]< "
                if $VKSEL; then
                    rm "$module/disable"
                    logger " "
                    logger "  >[Enabled module: $(basename "$module")]<  "
                    return
                fi
            fi
        done
    fi
    
    logger " "
    logger "  >[No module available to enable. Returning to previous menu.]< "
}

enable_modules() {
    while true; do
        show_enable_menu
        
        selected_option=""
        for option in "1" "2" "3" "4"; do
            logger "  >[$option]< "
            logger " "
            if $VKSEL; then
                selected_option="$option"
                logger " "
                logger "  >[Selected $selected_option]<  "
                break
            fi
        done

        case "$selected_option" in
            "1") 
                logger " "
                logger "###########################"
                logger "  >[Enabling Modules Please Wait.....]<  "
                logger " "
                disabled_modules=0
                for module_folder in /data/adb/modules/*; do
                    if [ -f "$module_folder/disable" ]; then
                        rm "$module_folder/disable"
                        logger "  >[Enabled module: $(basename "$module_folder")]<  "
                        sleep 0.6
                        disabled_modules=$((disabled_modules + 1))
                    fi
                done
                if [ "$disabled_modules" -eq 0 ]; then
                    logger " "
                    logger "  >[All modules are already enabled]<  "
                else
                    logger " "
                    logger "  >[Total Enabled: $disabled_modules Modules]<  "
                fi
                logger "###########################"
                return ;;
            "2") enable_module ;;
            "3") return ;;
            "4") logger "  >[Exiting...]<  "; logger "  >[Script exited]<  "; abort ;;
             *) logger "  >[Invalid option. Please try again.]<  " ;;
        esac
    done
}

remove_modules() {
    while true; do
        show_remove_menu
        
        
        selected_option=""
        for option in "1" "2" "3" "4"; do
            logger "  >[$option]< "
            logger " "
            if $VKSEL; then
                selected_option="$option"
                logger " "
                logger "  >[Selected $selected_option]<  "
                break
            fi
        done

        case "$selected_option" in
            "1") 
                logger " "
                logger "###########################"
                logger "  >[Removing Modules Please Wait.....]<  "
                logger " "
                rm_modules=0
                for module_folder in /data/adb/modules/*; do
                    if [ -d "$module_folder" ]; then
                        touch "$module_folder/remove"
                        logger "  >[Removed module: $(basename "$module_folder")]<  "
                        sleep 0.6
                        rm_modules=$((rm_modules + 1))
                    fi
                done
                logger " "
                logger "  >[Total Removed: $rm_modules Modules]<  "
                logger "###########################"
                return ;;
            "2") remove_specific_module ;;
            "3") return ;;
            "4") logger "  >[Exiting...]<  "; logger "  >[Script exited]<  "; abort ;;
             *) logger "  >[Invalid option. Please try again.]<  " ;;
        esac
    done
}

restore_modules() {
    while true; do
        show_restore_menu
        
        selected_option=""
        for option in "1" "2" "3" "4"; do
            logger "  >[$option]< "
            logger " "
            if $VKSEL; then
                selected_option="$option"
                logger " "
                logger "  >[Selected $selected_option]<  "
                break
            fi
        done

        case "$selected_option" in
            "1") 
                logger " "
                logger "###########################"
                logger "  >[Restoring Modules Please Wait.....]<  "
                logger " "
                removed_modules=0
                for module in /data/adb/modules/*; do
                    if [ -f "$module/remove" ]; then
                        rm "$module/remove"
                        logger "  >[Restored module: $(basename "$module")]<  "
                        sleep 0.6
                        removed_modules=$((removed_modules + 1))
                    fi
                done
                if [ "$removed_modules" -eq 0 ]; then
                    logger " "
                    logger "  >[All modules are already restored]<  "
                else
                    logger " "
                    logger "  >[Total Restored: $removed_modules Modules]<  "
                fi
                logger "###########################"
                ;;
            "2") restore_specific_module ;;
            "3") return ;;
            "4") logger "  >[Exiting...]<  "; logger "  >[Script exited]<  "; abort ;;
             *) logger "  >[Invalid option. Please try again.]<  " ;;
        esac
    done
}

list_modules() {
    logger " "
    logger "###########################"
    logger "  >[Finding Available modules:]< "
    local count=0
    for module_folder in /data/adb/modules/*; do
        if [ -d "$module_folder" ]; then
            module_name=$(basename "$module_folder")
            logger "  >[$((count + 1)). $module_name]< "
            count=$((count + 1))
            sleep 0.5
        fi
    done
    logger "###########################"
    logger " "
}

remove_modules_img() {
    if [ -f "/data/adb/ksu/modules.img" ]; then
        rm "/data/adb/ksu/modules.img"
        logger "  >[Removed modules.img successfully.]< "
    else
        logger "  >[modules.img not found.]< "
    fi
}

MODNAME=$(grep_prop name $TMPDIR/module.prop)
MODVER=$(grep_prop version $TMPDIR/module.prop)
DV=$(grep_prop author $TMPDIR/module.prop)
Device=$(getprop ro.product.device)
Model=$(getprop ro.product.model)
Brand=$(getprop ro.product.brand)

logger " "
logger "############################"
logger "  >[ Device Informations ]< "
logger "- Author: $DV"
logger "- Module: $MODNAME"
logger "- Version: $MODVER"
logger "- Kernel: $(uname -r)"
logger "- Brand: $Brand"
logger "- Device: $Device"
logger "- Model: $Model"
logger "############################"
logger " "

while true; do
    logger " "
    logger "###########################"
    logger "  >[ Choose Your Rooting Solution ]<  "
    logger "1. Magisk"
    logger "2. KSU"
    logger "3. Exit"
    logger "###########################"
    logger "  >[ Use Volume+ To Choose & Volume- To Switch Option!!! ]<    "
    logger "###########################"
    sleep 0.5
    logger " "

    selected_option=""
    for option in "1" "2" "3"; do
        logger "  >[$option]< "
        logger " "
        if $VKSEL; then
            selected_option="$option"
            logger " "
            logger "  >[Selected $selected_option]<  "
            break
        fi
    done

    case "$selected_option" in
        "1") handle_magisk ;;
        "2") handle_ksu ;;
        "3") logger "  >[Exiting...]<  "; logger "  >[Script exited]< "; abort ;;
        *) logger "  >[Invalid option. Please try again.]< " ;;
    esac
done