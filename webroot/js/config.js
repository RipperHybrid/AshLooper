export const Config = {
    logDirectory: '/cache/looper/',
    modulePropPath: '/data/adb/modules/AshLooper/module.prop',
    settingsPropPath: '/data/adb/modules/AshLooper/settings.prop',
    ashLooperDir: '/data/adb/ashlooper',
    downloadDir: '/storage/emulated/0/Download',
    updateManifestUrl: 'https://ashrexcue.pages.dev/assets/update.json',
    timeouts: {
        fetch: 15000,
        download: 60000,
        install: 300000,
        wgetSeconds: 10,
        wgetDownloadSeconds: 20,
    },
    rootManagers: [
        { id: 'ksu',    name: 'KernelSU', busybox: '/data/adb/ksu/bin/busybox', bin: '/data/adb/ksu/bin/ksud',  installArgs: 'module install' },
        { id: 'apatch', name: 'APatch',   busybox: '/data/adb/ap/bin/busybox',  bin: '/data/adb/apd',           installArgs: 'module install' },
        { id: 'magisk', name: 'Magisk',   busybox: '/data/adb/magisk/busybox',  bin: '/data/adb/magisk/magisk', installArgs: '--install-module' },
    ],
};