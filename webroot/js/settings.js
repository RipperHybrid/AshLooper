import { Utils } from './utils.js';
import { Config } from './main.js';

export class SettingsManager {
    constructor(mainInstance) {
        this.app = mainInstance;
        this.knownKeys = [
            'mode', 'loops', 'disable', 'log',
            'timeout', 'threshold', 'stability_time', 'extra_stability', 'monitor_scripts',
            'install_date', 'version', 'whitelist', 'name', 'versionCode', 'author', 'id', 'boot'
        ];
        this.pendingChanges = {};
    }

    async loadModuleData() {
        this.app.moduleInfo = {};
        try {
            const modContent = await Utils.ksuExec(`cat "${Config.modulePropPath}"`);
            this.parsePropContent(modContent);
            try {
                const rawContent = await Utils.ksuExec(`cat "${Config.settingsPropPath}"`);
                this.parsePropContent(rawContent);
                if (this.detectCorruption(rawContent)) await this.repairSettingsFile();
            } catch (e) {
                await this.repairSettingsFile();
            }
        } catch (error) {}
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
        for (const key of this.knownKeys) {
            if (this.app.moduleInfo[key] !== undefined && key !== 'version' && key !== 'name' && key !== 'versionCode' && key !== 'author' && key !== 'id') {
                await this.updateSettingProp(key, this.app.moduleInfo[key]);
            }
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
        if (['timeout', 'threshold', 'stability_time'].includes(key)) {
            const num = parseInt(rawValue.replace(/[^0-9-]/g, ''));
            return isNaN(num) ? rawValue : num.toString();
        }
        if (key === 'extra_stability' || key === 'monitor_scripts') return rawValue.toLowerCase().includes('false') ? 'false' : 'true';
        return rawValue;
    }

    async loadSettingsTab() {
        this.updateUI();
        this.bindEvents();
    }

    getOriginal(key) {
        const info = this.app.moduleInfo;
        if (key === 'timeout') return (parseInt(info.timeout) || 60).toString();
        if (key === 'stability_time') return (parseInt(info.stability_time) || 80).toString();
        if (key === 'threshold') return (parseInt(info.threshold) || 1).toString();
        if (key === 'extra_stability' || key === 'monitor_scripts') return info[key] !== 'false' ? 'true' : 'false';
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
                if (val === 'true') hasAdd = true;
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
        if (eInstallDate) eInstallDate.textContent = info.install_date || '—';
        if (eLog) eLog.textContent = info.log || '—';
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
        const s = parseInt(this.pendingChanges.stability_time !== undefined ? this.pendingChanges.stability_time : (info.stability_time || 80));
        const th = parseInt(this.pendingChanges.threshold !== undefined ? this.pendingChanges.threshold : (info.threshold || 1));
        const extra = this.pendingChanges.extra_stability !== undefined ? this.pendingChanges.extra_stability : (info.extra_stability === 'true' ? 'true' : 'false');
        const scripts = this.pendingChanges.monitor_scripts !== undefined ? this.pendingChanges.monitor_scripts : (info.monitor_scripts !== 'false' ? 'true' : 'false');

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
        if (eTogExtra) eTogExtra.checked = extra === 'true';
        if (eTogScripts) eTogScripts.checked = scripts === 'true';

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
        if (eSdn) eSdn.disabled = s <= 35;
        if (eSup) eSup.disabled = s >= 120;
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
                key === 'stability_time' ? next : parseInt(eS ? eS.textContent : 80),
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

        if (stabUpBtn) stabUpBtn.onclick = () => { if (!stabLongPress) handleStep('stability', 'stability_time', 35, 120, stabilityStep); };
        if (stabDnBtn) stabDnBtn.onclick = () => { if (!stabLongPress) handleStep('stability', 'stability_time', 35, 120, -stabilityStep); };

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
        let threshLongPress = false;

        const threshStartPress = () => {
            threshLongPress = false;
            threshPressTimer = setTimeout(() => {
                threshLongPress = true;
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
                    parseInt(eS?.textContent) || 80,
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
        if (togExtra) togExtra.onchange = (e) => markChange('extra_stability', e.target.checked ? 'true' : 'false');
        if (togScripts) togScripts.onchange = (e) => markChange('monitor_scripts', e.target.checked ? 'true' : 'false');

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

    _discard(silent = false) {
        this.pendingChanges = {};
        this.updateUI();
        if (!silent) {
            this.app.pill.hide();
            Utils.showToast('Changes discarded', 'info');
        }
    }

    async _save(silent = false) {
        if (!silent) Utils.showLoadingSpinner(true);

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
            if (key === 'extra_stability' || key === 'monitor_scripts') return val === 'true' ? 'On' : 'Off';
            return val;
        };
        const diffs = Object.keys(this.pendingChanges)
            .filter(key => labels[key])
            .map(key => `${labels[key]}: ${formatVal(key, this.app.moduleInfo[key])} → ${formatVal(key, this.pendingChanges[key])}`);

        await Promise.all(Object.keys(this.pendingChanges).map(k => this.updateSettingProp(k, this.pendingChanges[k])));
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
        const script = `if grep -q "^${key}=" "${Config.settingsPropPath}"; then sed -i 's~^${key}=.*~${key}=${value}~' "${Config.settingsPropPath}"; else echo '${key}=${value}' >> "${Config.settingsPropPath}"; fi`;
        await Utils.ksuExec(script);
        this.app.moduleInfo[key] = value;
    }

    async updateModuleDescription() {
        const info = this.app.moduleInfo;
        let smode = info.mode;
        if (smode === '1') smode = 'DM';
        else if (smode === '2') smode = 'DMR';
        else smode = 'DM';
        const threshold = info.threshold || '1';
        const stability = info.extra_stability === 'true' ? 'On' : 'Off';
        const scripts = info.monitor_scripts !== 'false' ? 'On' : 'Off';
        const newDesc = `🛡️ [Mode ${smode} | Threshold: ${threshold} boots | Stability Check: ${stability} | Boot Scripts (.d): ${scripts}] Bootloop Saver Protection For Magisk-KernelSU/Next.`;
        const script = `if grep -q "^description=" "${Config.modulePropPath}"; then sed -i 's~^description=.*~description=${newDesc}~' "${Config.modulePropPath}"; else echo 'description=${newDesc}' >> "${Config.modulePropPath}"; fi`;
        try {
            await Utils.ksuExec(script);
        } catch (error) {
            Utils.updateConsole('Failed to update module description', 'error');
        }
    }
}