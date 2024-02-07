#!/sbin/sh

# Define the paths
MODULE_PATH="/data/adb/modules/AshLooper"
KSU_PATH="/data/adb/ksu/modules.img"
MODULE_PROP="$MODPATH/module.prop"

# Function to display messages during installation
print_message() {
    echo "- $1"
}

# Function to display error messages
print_error() {
    echo "ERROR: $1" >&2
}

# Function to check if a file exists
check_file() {
    if [ -f "$1" ]; then
        return 0
    else
        return 1
    fi
}

# Function to update module description based on detection
update_description() {
    sed -i "s/^description=.*/description=$1/g" "$MODULE_PROP"
}

# Check if KSU is detected
if check_file "/data/adb/ksud"; then
    print_message "KSU detected, Installing The Module..."
    rm -rf "$KSU_PATH"
    update_description "[KernelSu Mode] AshLooper module tracks boot loops and disables Module and triggers recovery mode."
# Check if Magisk is detected
elif check_file "/data/adb/magisk/magiskboot"; then
    print_message "Magisk detected, Installing The Module..."
    update_description "[Magisk Mode] AshLooper module tracks boot loops and disables Module and triggers recovery mode."
    # Check if module directory exists
    if [ -d "$MODULE_PATH" ]; then
        rm -rf "$MODULE_PATH"
        print_message "Module already exists. Removing..."
    fi
fi

# Flashing AshLooper module
print_message "Flashing AshLooper module..."

# Additional messages
print_message "they..."
print_message "they want us to suffer..."