const LOG_DIR = '/cache/looper/';
const MODULE_DIR = '/data/adb/modules/AshLooper';

export const Config = {
    logDirectory: LOG_DIR,
    moduleDir: MODULE_DIR,
    modulePropPath: `${MODULE_DIR}/module.prop`,
    settingsPropPath: `${MODULE_DIR}/settings.prop`,
    safeCommands: [
        /^(ls -1|ls|cat) "?(\/cache\/looper\/|\/data\/adb\/modules\/AshLooper\/).*$/,
        /^(cp|mv|rm) "?(\/cache\/looper\/|\/data\/local\/tmp\/).*$/,
        /^sed -i "\/\^[a-zA-Z0-9_]+=\/d" "\/data\/adb\/modules\/AshLooper\/settings\.prop"$/,
        /^echo ".*" >> "\/data\/adb\/modules\/AshLooper\/settings\.prop"$/,
        /^sed -n '[0-9]+,[0-9]+p' "\/cache\/looper\/.*" > "\/data\/local\/tmp\/.*"$/,
        /^pgrep -f httpd -p 127\.0\.0\.1:.*$/,
        /^pkill -f httpd -p 127\.0\.0\.1:.*$/,
        /^date$/,
        /^uptime$/
    ]
};