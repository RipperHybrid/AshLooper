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
chmod -R 0755 $MODPATH/common/addon/Volume-Key-Selector/tools

chooseport_legacy() {
  # Keycheck binary by someone755 @Github, idea for code below by Zappo @xda-developers
  # Calling it first time detects previous input. Calling it second time will do what we want
  [ "$1" ] && local delay=$1 || local delay=10
  local error=false
  while true; do
    timeout 0 $MODPATH/common/addon/Volume-Key-Selector/tools/$ARCH32/keycheck
    timeout $delay $MODPATH/common/addon/Volume-Key-Selector/tools/$ARCH32/keycheck
    local sel=$?
    if [ $sel -eq 42 ]; then
      return 0
    elif [ $sel -eq 41 ]; then
      return 1
    else
      logger "  >[Volume key not detected. Aborting The Process]< "
      exit 1
    fi
  done
}

chooseport() {
  # Original idea by chainfire and ianmacd @xda-developers
  [ "$1" ] && local delay=$1 || local delay=10
  local error=false 
  while true; do
    local count=0
    while true; do
      timeout $delay /system/bin/getevent -lqc 1 2>&1 > $TMPDIR/events &
      sleep 0.5; count=$((count + 1))
      if (`grep -q 'KEY_VOLUMEUP *DOWN' $TMPDIR/events`); then
        return 0
      elif (`grep -q 'KEY_VOLUMEDOWN *DOWN' $TMPDIR/events`); then
        return 1
      fi
      [ $count -gt 12 ] && break
    done
    if $error; then
      # abort "Volume key not detected!"
      logger "  >[Volume key not detected. Trying keycheck method]< "
      logger " "
      export chooseport=chooseport_legacy VKSEL=chooseport_legacy
      chooseport_legacy $delay
      return $?
    else
      error=true
      logger "  >[Volume key not detected. Try again]< "
      logger " "
    fi
  done
}

# Keep old variable from previous versions of this
VKSEL=chooseport
