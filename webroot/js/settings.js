import { Utils } from './utils.js';
import { Config } from './config.js';

export class SettingsManager {
    constructor(mainInstance) {
        this.app = mainInstance;
        this.knownKeys = [
            'mode', 'loops', 'disable', 'log',
            'timeout', 'threshold', 'stability_time', 'extra_stability', 'monitor_scripts',
            'install_date', 'version', 'whitelist', 'name', 'versionCode', 'author', 'id', 'boot',
            'boot_id', 'kernel_uptime'
        ];
        this.pendingChanges = {};
        this.sanitized = false;
        this.repairing = false;
    }

    loadModuleData() {
        if (this.loadPromise) return this.loadPromise;
        this.loadPromise = this.fetchModuleData().finally(() => { this.loadPromise = null; });
        return this.loadPromise;
    }

    async fetchModuleData() {
        this.app.moduleInfo = {};
        this.settingsRead = false;
        try {
            const modContent = await Utils.ksuExec(`cat "${Config.modulePropPath}"`);
            this.parsePropContent(modContent);
            try {
                const rawContent = await Utils.ksuExec(`cat "${Config.settingsPropPath}"`);
                this.parsePropContent(rawContent);
                this.settingsRead = true;
                if (this.detectCorruption(rawContent)) await this.repairSettingsFile();
            } catch (e) {
                Utils.updateConsole(`Settings load failed: ${e.message}`, 'warning');
            }
        } catch (error) {}
    }

    async sanitizeLoadedValues() {
        if (this.sanitized) return;
        if (!this.settingsRead) return;
        this.sanitized = true;

        const fixes = this.clampLoadedValues();
        const keys = Object.keys(fixes);
        if (keys.length > 0) {
            for (const k of keys) {
                await this.updateSettingProp(k, fixes[k]);
                Utils.updateConsole(`Warning sanitized ${k} to ${fixes[k]}`, 'warning');
            }
            await this.updateModuleDescription();
            Utils.updateConsole(`Settings sanitized. Turns out reading the comments is free. Try it next time.`, 'warning');
            Utils.showToast(`Sanitized ${keys.length} invalid setting(s)`, 'warning');
        }
    }

    detectCorruption(content) {
        const lines = content.split(/\r?\n/);
        return lines.some(line => {
            if (!line.trim() || line.startsWith('#')) return false;
            const index = line.indexOf('=');
            if (index !== -1) {
                const key = line.substring(0, index).trim();
                const rawVal = line.substring(index + 1).trim();
                const cleanVal = this.cleanValue(key, rawVal);
                return rawVal !== cleanVal.toString();
            }
            return false;
        });
    }

    async repairSettingsFile() {
        if (this.repairing) return;
        this.repairing = true;
        try {
            for (const key of this.knownKeys) {
                if (this.app.moduleInfo[key] !== undefined && key !== 'version' && key !== 'name' && key !== 'versionCode' && key !== 'author' && key !== 'id') {
                    await this.updateSettingProp(key, this.app.moduleInfo[key]);
                }
            }
        } finally {
            this.repairing = false;
        }
    }

    parsePropContent(content) {
        const lines = content.split(/\r?\n/);
        lines.forEach(line => {
            if (line.trim() && !line.trim().startsWith('#')) {
                const index = line.indexOf('=');
                if (index !== -1) {
                    const key = line.substring(0, index).trim();
                    const rawValue = line.substring(index + 1).trim();
                    this.app.moduleInfo[key] = this.cleanValue(key, rawValue);
                }
            }
        });
    }

    cleanValue(key, rawValue) {
        if (['whitelist', 'log', 'disable', 'mode', 'install_date', 'name', 'versionCode', 'author', 'id', 'version', 'boot'].includes(key)) return rawValue;
        if (['timeout', 'threshold', 'stability_time', 'loops'].includes(key)) {
            const num = parseInt(rawValue.replace(/[^0-9-]/g, ''));
            return isNaN(num) ? rawValue : num.toString();
        }
        return rawValue;
    }

    clampLoadedValues() {
        const i = this.app.moduleInfo;
        const fixes = {};
        if (i.mode !== '1' && i.mode !== '2') { fixes.mode = '1'; i.mode = '1'; }
        if (!['1','2','3','4'].includes(i.threshold)) { fixes.threshold = '2'; i.threshold = '2'; }
        const to = parseInt(i.timeout);
        if (isNaN(to) || to < 1 || to > 100) { fixes.timeout = '60'; i.timeout = '60'; }
        const st = parseInt(i.stability_time);
        if (isNaN(st) || st < 45 || st > 90) { fixes.stability_time = '60'; i.stability_time = '60'; }
        if (i.extra_stability !== 'On' && i.extra_stability !== 'Off') { fixes.extra_stability = 'Off'; i.extra_stability = 'Off'; }
        if (i.monitor_scripts !== 'On' && i.monitor_scripts !== 'Off') { fixes.monitor_scripts = 'Off'; i.monitor_scripts = 'Off'; }
        if (!['none','partial','full'].includes(i.disable)) { fixes.disable = 'none'; i.disable = 'none'; }
        const lp = parseInt(i.loops);
        if (isNaN(lp) || lp < 0 || lp > 10) { fixes.loops = '0'; i.loops = '0'; }
        if (!/^\d+-\d+$/.test(i.log || '')) { fixes.log = '1-0'; i.log = '1-0'; }
        return fixes;
    }

    async loadSettingsTab() {
        this.updateUI();
        this.bindEvents();
        this.bindBootIdEvents();
    }

    getOriginal(key) {
        const info = this.app.moduleInfo;
        if (key === 'timeout') return (parseInt(info.timeout) || 60).toString();
        if (key === 'stability_time') {
            let v = parseInt(info.stability_time);
            if (isNaN(v)) v = 60;
            v = Math.max(45, Math.min(90, v));
            return v.toString();
        }
        if (key === 'threshold') return (parseInt(info.threshold) || 2).toString();
        if (key === 'extra_stability' || key === 'monitor_scripts') return info[key] === 'On' ? 'On' : 'Off';
        if (key === 'mode') return (info.mode === '1' || info.mode === '2') ? info.mode : '1';
        return info[key];
    }

    getChangeTypes() {
        let hasAdd = false;
        let hasRemove = false;
        for (const [key, val] of Object.entries(this.pendingChanges)) {
            const orig = this.getOriginal(key);
            if (key === 'timeout' || key === 'stability_time' || key === 'threshold') {
                if (parseInt(val) > parseInt(orig)) hasAdd = true;
                else if (parseInt(val) < parseInt(orig)) hasRemove = true;
            } else if (key === 'extra_stability' || key === 'monitor_scripts') {
                if (val === 'On') hasAdd = true;
                else hasRemove = true;
            } else if (key === 'mode') {
                if (val === '2') hasAdd = true;
                else hasRemove = true;
            } else {
                hasAdd = true;
                hasRemove = true;
            }
        }
        return { hasAdd, hasRemove };
    }

    updateUI() {
        const info = this.app.moduleInfo;
        const eInstallDate = document.getElementById('v-install-date');
        const eLog = document.getElementById('v-log');
        const eBootState = document.getElementById('v-boot-state');
        const eBootId = document.getElementById('v-boot-id');
        if (eInstallDate) eInstallDate.textContent = info.install_date || '—';
        if (eLog) eLog.textContent = info.log || '—';
        if (eBootId) {
            const bid = (info.boot_id && info.boot_id !== 'none') ? info.boot_id : '—';
            eBootId.textContent = bid === '—' ? bid : bid.slice(0, 8);
        }
        if (eBootState) {
            const state = info.boot || 'none';
            eBootState.textContent = state.charAt(0).toUpperCase() + state.slice(1);
            if (state === 'booting') eBootState.className = 's-row-value warn';
            else if (state === 'booted') eBootState.className = 's-row-value ok';
            else eBootState.className = 's-row-value';
        }

        const modeVal = this.pendingChanges.mode !== undefined ? this.pendingChanges.mode : ((info.mode === '1' || info.mode === '2') ? info.mode : '1');
        const modeTrigger = document.getElementById('s-sel-mode-trigger');
        if (modeTrigger) modeTrigger.textContent = modeVal === '1' ? '1 (DM)' : '2 (DMR)';

        const t = parseInt(this.pendingChanges.timeout !== undefined ? this.pendingChanges.timeout : (info.timeout || 60));
        const s = parseInt(this.pendingChanges.stability_time !== undefined ? this.pendingChanges.stability_time : (info.stability_time || 60));
        const th = parseInt(this.pendingChanges.threshold !== undefined ? this.pendingChanges.threshold : (info.threshold || 2));
        const extra = this.pendingChanges.extra_stability !== undefined ? this.pendingChanges.extra_stability : (info.extra_stability === 'On' ? 'On' : 'Off');
        const scripts = this.pendingChanges.monitor_scripts !== undefined ? this.pendingChanges.monitor_scripts : (info.monitor_scripts === 'On' ? 'On' : 'Off');

        const eValTimeout = document.getElementById('s-val-timeout');
        const eValStability = document.getElementById('s-val-stability');
        const eNumThreshold = document.getElementById('s-num-threshold');
        const eDTimeout = document.getElementById('d-timeout');
        const eTogExtra = document.getElementById('s-tog-extra');
        const eTogScripts = document.getElementById('s-tog-scripts');

        if (eValTimeout) eValTimeout.textContent = t + 's';
        if (eValStability) eValStability.textContent = s + 's';
        if (eNumThreshold) eNumThreshold.textContent = th;
        if (eDTimeout) eDTimeout.textContent = `Max wait: ${Math.max(1, t - 10)}—100s`;
        if (eTogExtra) eTogExtra.checked = extra === 'On';
        if (eTogScripts) eTogScripts.checked = scripts === 'On';

        this.refreshButtonStates(t, s, th);
    }

    updateModuleInfoPopup() {
        const info = this.app.moduleInfo;
        const eName = document.getElementById('v-name');
        const eVersion = document.getElementById('v-version');
        const eVersionCode = document.getElementById('v-version-code');
        const eAuthor = document.getElementById('v-author');
        const eModuleId = document.getElementById('v-module-id');
        if (eName) eName.textContent = info.name || 'AshReXcue';
        if (eVersion) eVersion.textContent = info.version || '—';
        if (eVersionCode) eVersionCode.textContent = info.versionCode || '—';
        if (eAuthor) eAuthor.textContent = info.author || 'AshBorn';
        if (eModuleId) eModuleId.textContent = info.id || 'AshLooper';
    }

    async openBootIdPopup() {
        const popup = document.getElementById('bootIdPopup');
        if (!popup) return;

        let recorded = (this.app.moduleInfo.boot_id && this.app.moduleInfo.boot_id !== 'none')
            ? this.app.moduleInfo.boot_id
            : '';
        try {
            const rawId = await Utils.ksuExec(`grep '^boot_id=' "${Config.settingsPropPath}" 2>/dev/null | cut -d'=' -f2-`);
            const clean = rawId.trim();
            if (clean && clean !== 'none') {
                recorded = clean;
                this.app.moduleInfo.boot_id = clean;
            }
        } catch (error) {}

        let current = '';
        try {
            current = await Utils.ksuExec('cat /proc/sys/kernel/random/boot_id 2>/dev/null');
            current = current.trim();
            if (!current) current = '';
        } catch (error) {}

        const recordedEl = document.getElementById('bootIdRecorded');
        const currentEl = document.getElementById('bootIdCurrent');
        if (recordedEl) recordedEl.textContent = recorded || '—';
        if (currentEl) currentEl.textContent = current || '—';

        document.body.classList.add('popup-open');
        popup.classList.add('active');
    }

    closeBootIdPopup() {
        const popup = document.getElementById('bootIdPopup');
        if (popup) popup.classList.remove('active');
        document.body.classList.remove('popup-open');
    }

    bindBootIdEvents() {
        const row = document.getElementById('bootIdRow');
        const closeBtn = document.getElementById('closeBootIdPopup');
        const copyBtn = document.getElementById('bootIdCopyBtn');
        const popup = document.getElementById('bootIdPopup');

        if (row) row.addEventListener('click', () => this.openBootIdPopup());
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeBootIdPopup());
        if (popup) {
            popup.addEventListener('click', (e) => {
                if (e.target === popup) this.closeBootIdPopup();
            });
        }
        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                const bid = (this.app.moduleInfo.boot_id && this.app.moduleInfo.boot_id !== 'none')
                    ? this.app.moduleInfo.boot_id
                    : '';
                if (!bid) {
                    Utils.showToast('Nothing to copy', 'warning');
                    return;
                }
                await Utils.copyToClipboard(bid);
                Utils.showToast('Boot ID copied', 'success');
            });
        }
    }

    refreshButtonStates(t, s, th) {
        const info = this.app.moduleInfo;
        const minT = Math.max(1, (parseInt(info.timeout) || 60) - 10);
        const eTdn = document.getElementById('s-timeout-dn');
        const eTup = document.getElementById('s-timeout-up');
        const eSdn = document.getElementById('s-stability-dn');
        const eSup = document.getElementById('s-stability-up');
        const eThdn = document.getElementById('s-thresh-dn');
        const eThup = document.getElementById('s-thresh-up');
        if (eTdn) eTdn.disabled = t <= minT;
        if (eTup) eTup.disabled = t >= 100;
        if (eSdn) eSdn.disabled = s <= 45;
        if (eSup) eSup.disabled = s >= 90;
        if (eThdn) eThdn.disabled = th <= 1;
        if (eThup) eThup.disabled = th >= 4;
    }

    bindEvents() {
        const markChange = (key, value) => {
            if (value === this.getOriginal(key)) delete this.pendingChanges[key];
            else this.pendingChanges[key] = value;
            this.app.updateGlobalPill();
        };

        const handleStep = (id, key, min, max, delta) => {
            const el = id === 'threshold'
                ? document.getElementById('s-num-threshold')
                : document.getElementById(`s-val-${id}`);
            if (!el) return;
            let cur = parseInt(el.textContent);
            let next = Math.max(min, Math.min(max, cur + delta));
            el.textContent = id === 'threshold' ? next : next + 's';
            const eT = document.getElementById('s-val-timeout');
            const eS = document.getElementById('s-val-stability');
            const eTh = document.getElementById('s-num-threshold');
            this.refreshButtonStates(
                key === 'timeout' ? next : parseInt(eT ? eT.textContent : 60),
                key === 'stability_time' ? next : parseInt(eS ? eS.textContent : 60),
                key === 'threshold' ? next : parseInt(eTh ? eTh.textContent : 1)
            );
            markChange(key, next.toString());
        };

        let stabilityStep = 5;
        const stabUpBtn = document.getElementById('s-stability-up');
        const stabDnBtn = document.getElementById('s-stability-dn');
        const stabBubble = document.getElementById('step-bubble-stability');
        let stabPressTimer;
        let stabLongPress = false;

        const stabStartPress = () => {
            stabLongPress = false;
            stabPressTimer = setTimeout(() => {
                stabLongPress = true;
                if (stabBubble) stabBubble.classList.add('visible');
                if ('vibrate' in navigator) navigator.vibrate(50);
            }, 400);
        };
        const stabCancelPress = () => clearTimeout(stabPressTimer);

        [stabUpBtn, stabDnBtn].forEach(btn => {
            if (!btn) return;
            btn.addEventListener('mousedown', stabStartPress);
            btn.addEventListener('touchstart', stabStartPress, { passive: true });
            btn.addEventListener('mouseup', stabCancelPress);
            btn.addEventListener('mouseleave', stabCancelPress);
            btn.addEventListener('touchend', stabCancelPress);
            btn.addEventListener('touchcancel', stabCancelPress);
            btn.addEventListener('touchmove', stabCancelPress, { passive: true });
        });

        if (stabBubble) {
            stabBubble.querySelectorAll('.step-option').forEach(opt => {
                opt.onclick = (e) => {
                    stabilityStep = parseInt(e.target.dataset.val);
                    stabBubble.querySelectorAll('.step-option').forEach(o => o.classList.remove('active'));
                    e.target.classList.add('active');
                    const stabUpBtn = document.getElementById('s-stability-up');
                    const stabDnBtn = document.getElementById('s-stability-dn');
                    if (stabUpBtn) stabUpBtn.textContent = `+${stabilityStep}`;
                    if (stabDnBtn) stabDnBtn.textContent = `-${stabilityStep}`;
                    stabBubble.classList.remove('visible');
                };
            });
        }

        if (stabUpBtn) stabUpBtn.onclick = () => { if (!stabLongPress) handleStep('stability', 'stability_time', 45, 90, stabilityStep); };
        if (stabDnBtn) stabDnBtn.onclick = () => { if (!stabLongPress) handleStep('stability', 'stability_time', 45, 90, -stabilityStep); };

        const threshUpBtn = document.getElementById('s-thresh-up');
        const threshDnBtn = document.getElementById('s-thresh-dn');
        const threshVal = document.getElementById('s-num-threshold');

        const threshBubble = document.createElement('div');
        threshBubble.className = 'step-bubble';
        threshBubble.id = 'step-bubble-threshold';
        threshBubble.innerHTML = `
            <div class="step-option" data-val="1">1</div>
            <div class="step-option" data-val="2">2</div>
            <div class="step-option" data-val="3">3</div>
            <div class="step-option" data-val="4">4</div>
        `;

        const threshStepper = threshDnBtn?.closest('.stepper');
        if (threshStepper) {
            threshStepper.style.position = 'relative';
            threshStepper.style.overflow = 'visible';
            threshStepper.appendChild(threshBubble);
        }

        const updateThreshBubbleActive = () => {
            const cur = parseInt(threshVal?.textContent) || 1;
            threshBubble.querySelectorAll('.step-option').forEach(o => {
                o.classList.toggle('active', parseInt(o.dataset.val) === cur);
            });
        };

        let threshPressTimer;

        const threshStartPress = () => {
            threshPressTimer = setTimeout(() => {
                updateThreshBubbleActive();
                threshBubble.classList.add('visible');
                if ('vibrate' in navigator) navigator.vibrate(50);
            }, 400);
        };
        const threshCancelPress = () => clearTimeout(threshPressTimer);

        if (threshVal) {
            threshVal.addEventListener('mousedown', threshStartPress);
            threshVal.addEventListener('touchstart', threshStartPress, { passive: true });
            threshVal.addEventListener('mouseup', threshCancelPress);
            threshVal.addEventListener('touchend', threshCancelPress);
            threshVal.addEventListener('touchcancel', threshCancelPress);
            threshVal.addEventListener('touchmove', threshCancelPress, { passive: true });
        }

        threshBubble.querySelectorAll('.step-option').forEach(opt => {
            opt.onclick = (e) => {
                const val = parseInt(e.target.dataset.val);
                if (threshVal) threshVal.textContent = val;
                threshBubble.querySelectorAll('.step-option').forEach(o => o.classList.remove('active'));
                e.target.classList.add('active');
                threshBubble.classList.remove('visible');
                const eT = document.getElementById('s-val-timeout');
                const eS = document.getElementById('s-val-stability');
                this.refreshButtonStates(
                    parseInt(eT?.textContent) || 60,
                    parseInt(eS?.textContent) || 60,
                    val
                );
                markChange('threshold', val.toString());
            };
        });

        let threshBtnLongPress = false;
        if (threshUpBtn) threshUpBtn.onclick = () => { if (!threshBtnLongPress) handleStep('threshold', 'threshold', 1, 4, 1); };
        if (threshDnBtn) threshDnBtn.onclick = () => { if (!threshBtnLongPress) handleStep('threshold', 'threshold', 1, 4, -1); };

        document.addEventListener('click', (e) => {
            if (stabBubble && !e.target.closest('#step-bubble-stability') && !e.target.closest('.stepper')) {
                stabBubble.classList.remove('visible');
            }
            if (threshBubble && !e.target.closest('#step-bubble-threshold') && !e.target.closest('.stepper')) {
                threshBubble.classList.remove('visible');
            }
        });

        const timeoutUp = document.getElementById('s-timeout-up');
        const timeoutDn = document.getElementById('s-timeout-dn');
        const togExtra = document.getElementById('s-tog-extra');
        const togScripts = document.getElementById('s-tog-scripts');

        if (timeoutUp) timeoutUp.onclick = () => handleStep('timeout', 'timeout', 1, 100, 1);
        if (timeoutDn) timeoutDn.onclick = () => handleStep('timeout', 'timeout', 1, 100, -1);
        if (togExtra) togExtra.onchange = (e) => markChange('extra_stability', e.target.checked ? 'On' : 'Off');
        if (togScripts) togScripts.onchange = (e) => markChange('monitor_scripts', e.target.checked ? 'On' : 'Off');

        const modeTrigger = document.getElementById('s-sel-mode-trigger');
        const modePopup = document.getElementById('modePopup');
        const closeModePopup = document.getElementById('closeModePopup');
        if (modeTrigger && modePopup) {
            modeTrigger.onclick = () => {
                document.body.classList.add('popup-open');
                const curVal = this.pendingChanges.mode || this.getOriginal('mode');
                modePopup.querySelectorAll('.mode-option').forEach(opt => {
                    opt.classList.toggle('active', opt.dataset.value === curVal);
                });
                modePopup.classList.add('active');
            };
            if (closeModePopup) closeModePopup.onclick = () => {
                modePopup.classList.remove('active');
                document.body.classList.remove('popup-open');
            };
            modePopup.onclick = (e) => {
                if (e.target === modePopup) {
                    modePopup.classList.remove('active');
                    document.body.classList.remove('popup-open');
                }
            };
            modePopup.querySelectorAll('.mode-option').forEach(opt => {
                opt.onclick = () => {
                    const val = opt.dataset.value;
                    modeTrigger.textContent = val === '1' ? '1 (DM)' : '2 (DMR)';
                    markChange('mode', val);
                    modePopup.classList.remove('active');
                    document.body.classList.remove('popup-open');
                };
            });
        }
    }

    discard(silent = false) {
        this.pendingChanges = {};
        this.updateUI();
        if (!silent) {
            this.app.pill.hide();
            Utils.showToast('Changes discarded', 'info');
        }
    }

    async save(silent = false) {
        if (!silent) Utils.showLoadingSpinner(true);

        for (const key of Object.keys(this.pendingChanges)) {
            const v = this.pendingChanges[key];
            if (key === 'timeout') {
                const n = parseInt(v);
                if (isNaN(n) || n < 1 || n > 100) this.pendingChanges[key] = '60';
            } else if (key === 'stability_time') {
                const n = parseInt(v);
                if (isNaN(n) || n < 45 || n > 90) this.pendingChanges[key] = '60';
            } else if (key === 'threshold') {
                const n = parseInt(v);
                if (isNaN(n) || n < 1 || n > 4) this.pendingChanges[key] = '2';
            } else if (key === 'mode') {
                if (v !== '1' && v !== '2') this.pendingChanges[key] = '1';
            } else if (key === 'extra_stability' || key === 'monitor_scripts') {
                if (v !== 'On' && v !== 'Off') this.pendingChanges[key] = 'Off';
            }
        }

        const labels = {
            mode: 'Protection mode',
            timeout: 'Timeout',
            stability_time: 'Stability time',
            threshold: 'Threshold',
            extra_stability: 'Extra stability',
            monitor_scripts: 'Monitor scripts'
        };
        const formatVal = (key, val) => {
            if (key === 'mode') return val === '1' ? 'DM' : val === '2' ? 'DMR' : val;
            if (key === 'timeout' || key === 'stability_time') return `${val}s`;
            if (key === 'extra_stability' || key === 'monitor_scripts') return val;
            return val;
        };
        const diffs = Object.keys(this.pendingChanges)
            .filter(key => labels[key])
            .map(key => `${labels[key]}: ${formatVal(key, this.app.moduleInfo[key])} → ${formatVal(key, this.pendingChanges[key])}`);

        for (const k of Object.keys(this.pendingChanges)) {
            await this.updateSettingProp(k, this.pendingChanges[k]);
        }
        this.pendingChanges = {};
        await this.updateModuleDescription();
        this.updateUI();

        for (const diff of diffs) {
            Utils.logChange(diff);
        }

        if (!silent) {
            this.app.pill.hide();
            Utils.showLoadingSpinner(false);
            Utils.showToast('Settings saved', 'success');
        }
    }

    async updateSettingProp(key, value) {
        const escVal = String(value).replace(/[&~]/g, '\\$&');
        const script = `f="${Config.settingsPropPath}"; if grep -qE "^[[:space:]]*${key}=" "$f"; then sed -i -E 's~^[[:space:]]*${key}=.*~${key}=${escVal}~' "$f"; else echo '${key}=${value}' >> "$f"; fi`;
        await Utils.ksuExec(script);
        this.app.moduleInfo[key] = value;
    }

    async updateModuleDescription() {
        const info = this.app.moduleInfo;
        let smode = info.mode;
        if (smode === '1') smode = 'DM';
        else if (smode === '2') smode = 'DMR';
        else smode = 'DM';
        let threshold = String(info.threshold ?? '');
        let timeout = String(info.timeout ?? '');
        let stabilityTime = String(info.stability_time ?? '');
        let scripts = info.monitor_scripts === 'On' ? 'On' : 'Off';
        let whitelist = String(info.whitelist ?? '');
        try {
            const fresh = await Utils.ksuExec(`cat "${Config.settingsPropPath}" 2>/dev/null`);
            fresh.split('\n').forEach(line => {
                const idx = line.indexOf('=');
                if (idx === -1) return;
                const k = line.substring(0, idx).trim();
                const v = line.substring(idx + 1).trim();
                if (k === 'timeout' && v) timeout = v;
                else if (k === 'threshold' && v) threshold = v;
                else if (k === 'mode' && v) smode = v === '2' ? 'DMR' : 'DM';
                else if (k === 'stability_time') stabilityTime = v;
                else if (k === 'monitor_scripts') scripts = v === 'On' ? 'On' : 'Off';
                else if (k === 'whitelist') whitelist = v;
            });
        } catch (e) {}
        const isNum = (s) => /^[0-9]+$/.test(s);
        const finalThreshold = isNum(threshold) ? threshold : '1';
        const finalTimeout = isNum(timeout) ? timeout : '60';
        const bootWord = finalThreshold === '1' ? 'boot' : 'boots';
        const st = parseInt(stabilityTime, 10);
        const stabInRange = isNum(stabilityTime) && st >= 45 && st <= 90;
        const stab = stabInRange ? `Stability: On (${stabilityTime}s)` : `Stability: Off`;
        const wlItems = whitelist.replace(/[\\'"\s]/g, '').split(',').filter(id => id && id !== 'AshLooper');
        const wlScr = wlItems.filter(id => /^svc:/.test(id)).length;
        const wlMod = wlItems.length - wlScr;
        const wlParts = [];
        if (wlMod > 0) wlParts.push(`${wlMod} Module`);
        if (wlScr > 0) wlParts.push(`${wlScr} Script`);
        const whitelistText = wlParts.length ? wlParts.join(' / ') : 'None';
        const newDesc = `🔰 Status: Mode ${smode} | Threshold: ${finalThreshold} ${bootWord} | Timeout: ${finalTimeout}s | Scripts (.d): ${scripts} | ${stab} | Whitelist: ${whitelistText}.`;
        const b64 = btoa(unescape(encodeURIComponent(newDesc)));
        const script = `desc=$(printf '%s' "${b64}" | base64 -d); propf="${Config.modulePropPath}"; if grep -q "^description=" "$propf"; then grep -v "^description=" "$propf" > "$propf.tmp"; printf 'description=%s\\n' "$desc" >> "$propf.tmp"; mv "$propf.tmp" "$propf"; else printf 'description=%s\\n' "$desc" >> "$propf"; fi`;
        try {
            await Utils.ksuExec(script);
        } catch (error) {
            Utils.updateConsole('Failed to update module description', 'error');
        }
    }
}
