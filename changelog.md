# AshReXcue - Version 9.0 Changelog

## 🎉 Major Rebrand: AshLooper → AshReXcue
- **Complete module rename** to "AshReXcue - Bootloop Protector"
- **New visual identity** with enhanced logo and branding
- **Updated all references** from AshLooper to AshReXcue throughout codebase
- **Log files now use** `AshReXcueSession-` prefix instead of `AshLooperSession-`

## 🚀 Enhanced Protection System
- **Advanced Stability Monitoring** with post-boot process verification
- **Intelligent Module Detection** now tracks module size changes in addition to version/status
- **Configurable Stability Period** with new `stability_time` property (default: 80s)
- **Consecutive Failure Tracking** with 3-strike system before protection triggers
- **Critical Process Monitoring** for system_server and surfaceflinger

## 🔧 Technical Improvements
- **Fixed MODE variable** handling in lockdown function
- **Enhanced JSON comparison** with comprehensive change detection
- **Better error handling** for system command availability
- **Improved boot completion** verification using multiple methods
- **Professional installation UI** with boxed layout and better UX

## 🎨 Web UI v2.0 Updates
- **AshReXcue WebUI V2.0** with updated branding
- **Enhanced session management** for boot session viewing
- **Improved mobile responsiveness** and accessibility
- **Better settings validation** with real-time feedback
- **ARIA labels** and semantic HTML for accessibility

## 🛡️ Stability & Reliability
- **Post-boot crash detection** with configurable monitoring period
- **System process validation** using both `pgrep` and `service check` methods
- **Enhanced module change logging** with detailed change descriptions
- **Better property access validation** during stability checks

## 📱 Installation & Configuration
- **Streamlined setup process** with clear step-by-step interface
- **Enhanced mode selection** with better visual feedback
- **Improved threshold configuration** (1-4 failed boots)
- **Professional console output** with formatted boxes and icons

## 🔄 Backward Compatibility
- **Maintains existing configuration** structure
- **Preserves all existing functionality** while adding new features
- **Smooth upgrade path** from AshLooper v8.1

> **Note:** This update represents a significant evolution from AshLooper to AshReXcue, focusing on enhanced stability monitoring and professional user experience while maintaining the core bootloop protection functionality.