## Version 2.1 Changelog

- **Enhancement:**  
  - Improved installation for KSU support:
    - Fixed module installation process for KSU, ensuring proper handling of `modules.img` deletion regardless of previous installation status.
    - Increased threshold to 4 boot attempts for improved KSU support.
    - Added update JSON functionality for easy module updates from Magisk or KSU.
  - Support for Different Thresholds:
    - Implemented support for setting different boot loop thresholds for Magisk and KSU environments.
    - Magisk threshold set to 3, KSU threshold set to 4.

- **Testing Note:**
  - The module has been tested on Realme UI 4 and in custom ROMs.
  - Tested on:
    - SparkOs A13
    - Afterlife A13
    - Voltage A14
    - LeafOs 13