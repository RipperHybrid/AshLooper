# Properties
sysboot=$(getprop sys.boot_completed)

if [ "$sysboot" = 1 ]; then
    arg1="$1"
    arg2="$2"
    my_magisk_installer=true
    type flash_image &>$(dirname $arg3)/log.txt || flash_image() { dd if="$1" of="$2"; }
else
    arg1="$1"
    arg2="$2"
    arg3="$3"
    my_magisk_installer=false
    type flash_image || flash_image() { dd if="$1" of="$2"; }
    ui_print() { echo -e "ui_print "$1"\nui_print" >>"/proc/self/fd/$arg2"; }
    MODPATH="$TMPDIR"
fi

# External Tools
chmod -R 0755 $MODPATH/common/addon/BusyBox/busybox


bb="$MODPATH/common/addon/BusyBox/busybox"