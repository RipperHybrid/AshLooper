# AshReXcue - Version 9.1 Changelog

## 🚀 Enhanced Core Architecture
- **Separated script execution** with dedicated `post-fs-data.sh` and `service.sh` files
- **Improved root detection** with robust KernelSU and Magisk verification
- **Enhanced module tracking** with name-based identification in JSON comparisons

## 🛡️ Advanced Protection System
- **Faster stability monitoring** with reduced check interval (3 seconds vs 5 seconds)
- **Tighter threshold constraints** limited to 1-5 boot loops (previously 1-10)
- **Enhanced consecutive failure tracking** with improved process validation
- **Stability time configuration** with range validation (50-120 seconds)

## 🎨 Web UI v2.1 Enhancements
- **Three theme system** with Dark, Light, and Retro (Amber) modes
- **Enhanced session detection** with "unfinished" status indicators
- **Improved animations** with bounce effects and smooth transitions
- **Better mobile responsiveness** and touch interactions

## 🔧 Technical Improvements
- **Enhanced uninstall script** that properly cleans module data directories
- **Safe content handling** with proper escaping for file operations
- **Improved error suppression** and logging throughout the system
- **Better KSU API integration** with proper callback handling

## 🎯 User Experience
- **Streamlined installation UI** with better visual hierarchy
- **Enhanced console feedback** with more descriptive status messages
- **Improved session selection** with detailed boot session information
- **Better file operations** with enhanced safety and error handling

## 🔒 Safety & Reliability
- **Enhanced content sanitization** for all file operations
- **Improved crash detection** with better system process monitoring
- **Robust error recovery** throughout the protection system
- **Better boot sequence validation** with multiple verification methods