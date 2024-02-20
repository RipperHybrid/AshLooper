## Version 2.2 Changelog

### Change Log for AshLooper Module Script (Version 2.2):

- Modified the script to conditionally list the folders inside the modules directory based on whether the boot loop threshold is reached.
- Refactored the `handle_ksu` and `handle_magisk` functions to log modules only if the boot loop threshold isn't reached.
- Updated the `list_modules` function calls within the `handle_ksu` and `handle_magisk` functions to reflect the conditional logging of modules.
- Ensured that if the boot loop threshold is reached, modules are listed before triggering the recovery mode.
- Improved clarity and maintainability of the script by documenting the changes made.