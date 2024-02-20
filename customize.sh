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
    sed -i "s|^description=.*|description=$1|g" "$MODULE_PROP"
}

# Check if KSU is detected
if check_file "/data/adb/ksud"; then
    print_message "KernelSU Detected. Installing the module..."
    rm -rf "$KSU_PATH"
    update_description "[KernelSU Mode] AshLooper module tracks boot loops and disables the module, triggering recovery mode if necessary."
# Check if Magisk is detected
elif check_file "/data/adb/magisk/magiskboot"; then
    print_message "Magisk Detected. Installing the module..."
    update_description "[Magisk Mode] AshLooper module tracks boot loops and disables the module, triggering recovery mode if necessary."
    # Check if module directory exists
    if [ -d "$MODULE_PATH" ]; then
        rm -rf "$MODULE_PATH"
        print_message "Module already exists. Removing..."
    fi
else
    print_error "Neither KernelSU nor Magisk detected. Please install the module using a supported root method."
    exit 1
fi

# Flashing AshLooper module
print_message "ACTION: Flashing AshLooper module..."

# Additional messages
print_message "They want us to suffer... But AshLooper won't let them!"