##########################################################################################
#
# MMT Extended Utility Functions
#
##########################################################################################

require_new_ksu() {
  ui_print "**********************************"
  ui_print " Please install KernelSU v0.6.6+! "
  ui_print "**********************************"
  exit 1
}

umount_mirrors() {
  [ -d $ORIGDIR ] || return 0
  for i in $ORIGDIR/*; do
    umount -l $i 2>/dev/null
  done
  rm -rf $ORIGDIR 2>/dev/null
  mount -o ro,remount $MAGISKTMP
}

cleanup() {
  $KSU && umount_mirrors
  rm -rf $MODPATH/common $MODPATH/install.zip 2>/dev/null
}

abort() {
  ui_print "$1"
  rm -rf $MODPATH 2>/dev/null
  cleanup
  rm -rf $TMPDIR 2>/dev/null
  exit 1
}

device_check() {
  local opt=`getopt -o dm -- "$@"` type=device
  eval set -- "$opt"
  while true; do
    case "$1" in
      -d) local type=device; shift;;
      -m) local type=manufacturer; shift;;
      --) shift; break;;
      *) abort "Invalid device_check argument $1! Aborting!";;
    esac
  done
  local prop=$(echo "$1" | tr '[:upper:]' '[:lower:]')
  for i in /system /vendor /odm /product; do
    if [ -f $i/build.prop ]; then
      for j in "ro.product.$type" "ro.build.$type" "ro.product.vendor.$type" "ro.vendor.product.$type"; do
        [ "$(sed -n "s/^$j=//p" $i/build.prop 2>/dev/null | head -n 1 | tr '[:upper:]' '[:lower:]')" == "$prop" ] && return 0
      done
      [ "$type" == "device" ] && [ "$(sed -n "s/^"ro.build.product"=//p" $i/build.prop 2>/dev/null | head -n 1 | tr '[:upper:]' '[:lower:]')" == "$prop" ] && return 0
    fi
  done
  return 1
}

cp_ch() {
  local opt=`getopt -o nr -- "$@"` BAK=true UBAK=true FOL=false
  eval set -- "$opt"
  while true; do
    case "$1" in
      -n) UBAK=false; shift;;
      -r) FOL=true; shift;;
      --) shift; break;;
      *) abort "Invalid cp_ch argument $1! Aborting!";;
    esac
  done
  local SRC="$1" DEST="$2" OFILES="$1"
  $FOL && local OFILES=$(find $SRC -type f 2>/dev/null)
  [ -z $3 ] && PERM=0644 || PERM=$3
  case "$DEST" in
    $TMPDIR/*|$MODULEROOT/*|$NVBASE/modules/$MODID/*) BAK=false;;
  esac
  for OFILE in ${OFILES}; do
    if $FOL; then
      if [ "$(basename $SRC)" == "$(basename $DEST)" ]; then
        local FILE=$(echo $OFILE | sed "s|$SRC|$DEST|")
      else
        local FILE=$(echo $OFILE | sed "s|$SRC|$DEST/$(basename $SRC)|")
      fi
    else
      [ -d "$DEST" ] && local FILE="$DEST/$(basename $SRC)" || local FILE="$DEST"
    fi
    if $BAK && $UBAK; then
      [ ! "$(grep "$FILE$" $INFO 2>/dev/null)" ] && echo "$FILE" >> $INFO
      [ -f "$FILE" -a ! -f "$FILE~" ] && { mv -f $FILE $FILE~; echo "$FILE~" >> $INFO; }
    elif $BAK; then
      [ ! "$(grep "$FILE$" $INFO 2>/dev/null)" ] && echo "$FILE" >> $INFO
    fi
    install -D -m $PERM "$OFILE" "$FILE"
  done
}

install_script() {
  case "$1" in
    -b) shift; 
        if $KSU; then
          local INPATH=$NVBASE/boot-completed.d
        else
          local INPATH=$SERVICED
          sed -i -e '1i (\nwhile [ "$(getprop sys.boot_completed)" != "1" ]; do\n  sleep 1\ndone\nsleep 3\n' -e '$a)&' $1
        fi;;
    -l) shift; local INPATH=$SERVICED;;
    -p) shift; local INPATH=$POSTFSDATAD;;
    *) local INPATH=$SERVICED;;
  esac
  [ "$(grep "#!/system/bin/sh" $1)" ] || sed -i "1i #!/system/bin/sh" $1
  local i; for i in "MODPATH" "LIBDIR" "MODID" "INFO" "MODDIR"; do
    case $i in
      "MODPATH") sed -i "1a $i=$NVBASE/modules/$MODID" $1;;
      "MODDIR") sed -i "1a $i=\${0%/*}" $1;;
      *) sed -i "1a $i=$(eval echo \$$i)" $1;;
    esac
  done
  case $1 in
    "$MODPATH/post-fs-data.sh"|"$MODPATH/service.sh"|"$MODPATH/uninstall.sh") sed -i "s|^MODPATH=.*|MODPATH=\$MODDIR|" $1;; # MODPATH=MODDIR for these scripts (located in module directory)
    "$MODPATH/boot-completed.sh") $KSU && sed -i "s|^MODPATH=.*|MODPATH=\$MODDIR|" $1 || { cp_ch -n $1 $INPATH/$MODID-$(basename $1) 0755; rm -f $MODPATH/boot-completed.sh; };;
    *) cp_ch -n $1 $INPATH/$(basename $1) 0755;;
  esac
}

prop_process() {
  sed -i -e "/^#/d" -e "/^ *$/d" $1
  [ -f $MODPATH/system.prop ] || mktouch $MODPATH/system.prop
  while read LINE; do
    echo "$LINE" >> $MODPATH/system.prop
  done < $1
}

mount_mirrors() {
  mount -o rw,remount $MAGISKTMP
  mkdir -p $ORIGDIR/system
  if $SYSTEM_ROOT; then
    mkdir -p $ORIGDIR/system_root
    mount -o ro / $ORIGDIR/system_root
    mount -o bind $ORIGDIR/system_root/system $ORIGDIR/system
  else
    mount -o ro /system $ORIGDIR/system
  fi
  for i in /vendor $PARTITIONS; do
    [ ! -d $i -o -d $ORIGDIR$i ] && continue
    mkdir -p $ORIGDIR$i
    mount -o ro $i $ORIGDIR$i
  done
}


# Check for min/max api version
[ -z $MINAPI ] || { [ $API -lt $MINAPI ] && abort "! Your system API of $API is less than the minimum api of $MINAPI! Aborting!"; }
[ -z $MAXAPI ] || { [ $API -gt $MAXAPI ] && abort "! Your system API of $API is greater than the maximum api of $MAXAPI! Aborting!"; }


# Start debug
set -x

# Set variables
[ -z $ARCH32 ] && ARCH32="$(echo $ABI32 | cut -c-3)"
[ $API -lt 26 ] && DYNLIB=false
[ -z $DYNLIB ] && DYNLIB=false
[ -z $PARTOVER ] && PARTOVER=false
INFO=$NVBASE/modules/.$MODID-files
if $KSU; then
  MAGISKTMP="/mnt"
  ORIGDIR="$MAGISKTMP/mirror"
  mount_mirrors
elif [ "$(magisk --path 2>/dev/null)" ]; then
  ORIGDIR="$(magisk --path 2>/dev/null)/.magisk/mirror"
elif [ "$(echo $MAGISKTMP | awk -F/ '{ print $NF}')" == ".magisk" ]; then
  ORIGDIR="$MAGISKTMP/mirror"
else
  ORIGDIR="$MAGISKTMP/.magisk/mirror"
fi
if $DYNLIB; then
  LIBPATCH="\/vendor"
  LIBDIR=/system/vendor
else
  LIBPATCH="\/system"
  LIBDIR=/system
fi
# Detect extra partition compatibility (KernelSU or Magisk Delta)
EXTRAPART=false
if $KSU || [ "$(echo $MAGISK_VER | awk -F- '{ print $NF}')" == "delta" ]; then
  EXTRAPART=true
elif ! $PARTOVER; then
  unset PARTITIONS
fi

if ! $BOOTMODE; then
  ui_print "- Only uninstall is supported in recovery"
  ui_print "  Uninstalling!"
  touch $MODPATH/remove
  [ -s $INFO ] && install_script $MODPATH/uninstall.sh || rm -f $INFO $MODPATH/uninstall.sh
  recovery_cleanup
  cleanup
  rm -rf $NVBASE/modules_update/$MODID $TMPDIR 2>/dev/null
  exit 0
fi

# Extract files
echo "###########################"
ui_print "- Extracting module files"
unzip -o "$ZIPFILE" -x 'META-INF/*' 'common/functions.sh' -d $MODPATH >&2
[ -f "$MODPATH/common/addon.tar.xz" ] && tar -xf $MODPATH/common/addon.tar.xz -C $MODPATH/common 2>/dev/null

# Run addons
if [ "$(ls -A $MODPATH/common/addon/*/install.sh 2>/dev/null)" ]; then
  ui_print "- Running Addons"
  for i in $MODPATH/common/addon/*/install.sh; do
    ui_print "- Running $(echo $i | sed -r "s|$MODPATH/common/addon/(.*)/install.sh|\1|")..."
    . $i
  done
fi

# Remove files outside of module directory
ui_print "- Removing old files"

if [ -f $INFO ]; then
  while read LINE; do
    if [ "$(echo -n $LINE | tail -c 1)" == "~" ]; then
      continue
    elif [ -f "$LINE~" ]; then
      mv -f $LINE~ $LINE
    else
      rm -f $LINE
      while true; do
        LINE=$(dirname $LINE)
        [ "$(ls -A $LINE 2>/dev/null)" ] && break 1 || rm -rf $LINE
      done
    fi
  done < $INFO
  rm -f $INFO
fi

### Install
ui_print "- Installing"

[ -f "$MODPATH/common/install.sh" ] && . $MODPATH/common/install.sh

ui_print "###########################"
ui_print "- Setting Permissions"
ui_print "###########################"
set_perm_recursive $MODPATH 0 0 0755 0644
for i in /system/vendor /vendor /system/vendor/app /vendor/app /system/vendor/etc /vendor/etc /system/odm/etc /odm/etc /system/vendor/odm/etc /vendor/odm/etc /system/vendor/overlay /vendor/overlay; do
  if [ -d "$MODPATH$i" ] && [ ! -L "$MODPATH$i" ]; then
    case $i in
      *"/vendor") set_perm_recursive $MODPATH$i 0 0 0755 0644 u:object_r:vendor_file:s0;;
      *"/app") set_perm_recursive $MODPATH$i 0 0 0755 0644 u:object_r:vendor_app_file:s0;;
      *"/overlay") set_perm_recursive $MODPATH$i 0 0 0755 0644 u:object_r:vendor_overlay_file:s0;;
      *"/etc") set_perm_recursive $MODPATH$i 0 2000 0755 0644 u:object_r:vendor_configs_file:s0;;
    esac
  fi
done
for i in $(find $MODPATH/system/vendor $MODPATH/vendor -type f -name *".apk" 2>/dev/null); do
  chcon u:object_r:vendor_app_file:s0 $i
done
set_permissions

# Complete install
cleanup
