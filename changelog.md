### v9.3 - Nexus Update Major Changes

## 1. **WebUI Architecture Overhaul**
- **New Local-only WebUI Server For Magisk**: Built-in HTTP server with BusyBox `httpd`
- **Enhanced Security**:
  - Random port generation (6000-9999 range)
  - Secure token authentication via `/nexus/uplink_key`
  - Session management with auto-shutdown (5min max, 1min idle, localhost only)
  - Whitelist-based command execution in CGI
  - Activity heartbeat tracking and automatic session cleanup

### 2. **Module Core Enhancements**
- **Root Detection**: Added APatch support alongside KernelSU & Magisk
- **RTC Status Monitoring**: Detects system clock issues during boot (CORRECT/BACKWARD status)
- **Service Locking**: `/dev/AshReXcue_service_lock` prevents parallel execution

### 3. **WebUI Features**
- **Enhanced Log Parser**: Smart session detection with metadata extraction
- **Modular Architecture**: Refactored JavaScript (main.js, utils.js, files.js, settings.js)
- **Real-time Settings**: Adjust timeout, threshold, stability time via WebUI
- **Log Export**: Save individual sessions or full logs to Downloads

### 4. **Security Improvements**
- **Command Validation**: Whitelist-only execution in CGI for security
- **Secure Token Generation**: UUID-based authentication tokens
- **Localhost Isolation**: Server binds only to 127.0.0.1
- **Monitor Scripts**: Automatic cleanup of stale processes