## Version 8.1 Changelog

### AshLooper Module Script (Version 8.1) Normal Fixes:

### Technical Improvements
- Add updateSaveButtonState() method to validate both timeout and threshold
- Disable save button immediately when invalid timeout is entered
- Remove interval polling in favor of real-time validation
- Ensure timeout follows same validation pattern as threshold (1-10 range)
- Prevent saving when timeout decreases more than 10 seconds from current value