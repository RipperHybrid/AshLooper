import { Utils, ChangesPill } from './utils.js';
import { Config } from './main.js';

export class SettingsManager {
    constructor(mainInstance) {
        this.app = mainInstance;
        this.knownKeys = [
            'mode', 'loops', 'disable', 'log',
            'timeout', 'threshold', 'stability_time', 'extra_stability',
            'install_date', 'version', 'whitelist', 'name', 'versionCode', 'author', 'id', 'boot'
        ];
        this.pendingChanges = {};
        this.pill = new ChangesPill({ onSave: () => this._save(), onDiscard: () => this._discard() });
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
        if (key === 'extra_stability') return rawValue.toLowerCase().includes('true') ? 'true' : 'false';
        return rawValue;
    }

    async loadSettingsTab() {
        this.pendingChanges = {};
        this.pill.hide();
        await this.loadModuleData();
        this.updateUI();
        this.bindEvents();
    }

    updateUI() {
        const info = this.app.moduleInfo;

        const eName = document.getElementById('v-name');
        const eVersion = document.getElementById('v-version');
        const eVersionCode = document.getElementById('v-version-code');
        const eAuthor = document.getElementById('v-author');
        const eModuleId = document.getElementById('v-module-id');
        const eInstallDate = document.getElementById('v-install-date');
        const eLog = document.getElementById('v-log');
        const eBootState = document.getElementById('v-boot-state');

        if (eName) eName.textContent = info.name || 'AshReXcue';
        if (eVersion) eVersion.textContent = info.version || '—';
        if (eVersionCode) eVersionCode.textContent = info.versionCode || '—';
        if (eAuthor) eAuthor.textContent = info.author || 'AshBorn';
        if (eModuleId) eModuleId.textContent = info.id || 'AshLooper';
        if (eInstallDate) eInstallDate.textContent = info.install_date || '—';
        if (eLog) eLog.textContent = info.log || '—';

        if (eBootState) {
            const state = info.boot || 'none';
            eBootState.textContent = state.charAt(0).toUpperCase() + state.slice(1);
            if (state === 'booting') eBootState.className = 's-row-value warn';
            else if (state === 'booted') eBootState.className = 's-row-value ok';
            else eBootState.className = 's-row-value';
        }

        const modeVal = (info.mode === '1' || info.mode === '2') ? info.mode : '1';
        const modeTrigger = document.getElementById('s-sel-mode-trigger');
        if (modeTrigger) modeTrigger.textContent = modeVal === '1' ? '1 (DM)' : '2 (DMR)';

        const t = parseInt(info.timeout) || 60;
        const s = parseInt(info.stability_time) || 80;
        const th = parseInt(info.threshold) || 1;
        const eValTimeout = document.getElementById('s-val-timeout');
        const eValStability = document.getElementById('s-val-stability');
        const eNumThreshold = document.getElementById('s-num-threshold');
        const eDTimeout = document.getElementById('d-timeout');
        const eTogExtra = document.getElementById('s-tog-extra');

        if (eValTimeout) eValTimeout.textContent = t + 's';
        if (eValStability) eValStability.textContent = s + 's';
        if (eNumThreshold) eNumThreshold.textContent = th;
        if (eDTimeout) eDTimeout.textContent = `Max wait: ${Math.max(1, t - 10)}—100s`;
        if (eTogExtra) eTogExtra.checked = info.extra_stability === 'true';
        this.refreshButtonStates(t, s, th);
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
        if (eThup) eThup.disabled = th >= 5;
    }

    bindEvents() {
        const info = this.app.moduleInfo;
        const originals = {
            timeout: (parseInt(info.timeout) || 60).toString(),
            stability_time: (parseInt(info.stability_time) || 80).toString(),
            threshold: (parseInt(info.threshold) || 1).toString(),
            extra_stability: info.extra_stability === 'true' ? 'true' : 'false',
            mode: (info.mode === '1' || info.mode === '2') ? info.mode : '1'
        };

        const markChange = (key, value) => {
            if (value === originals[key]) delete this.pendingChanges[key];
            else this.pendingChanges[key] = value;
            this.pill.update(Object.keys(this.pendingChanges).length);
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
        const bubble = document.getElementById('step-bubble-stability');
        let pressTimer;
        let isLongPress = false;

        const updateStabilityBtns = () => {
            if (stabUpBtn) stabUpBtn.textContent = `+${stabilityStep}`;
            if (stabDnBtn) stabDnBtn.textContent = `-${stabilityStep}`;
        };

        const startPress = () => {
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                if (bubble) bubble.classList.add('visible');
                if ('vibrate' in navigator) navigator.vibrate(50);
            }, 400);
        };
        const cancelPress = () => clearTimeout(pressTimer);

        [stabUpBtn, stabDnBtn].forEach(btn => {
            if (!btn) return;
            btn.addEventListener('mousedown', startPress);
            btn.addEventListener('touchstart', startPress, { passive: true });
            btn.addEventListener('mouseup', cancelPress);
            btn.addEventListener('mouseleave', cancelPress);
            btn.addEventListener('touchend', cancelPress);
            btn.addEventListener('touchcancel', cancelPress);
            btn.addEventListener('touchmove', cancelPress, { passive: true });
        });

        if (bubble) {
            bubble.querySelectorAll('.step-option').forEach(opt => {
                opt.onclick = (e) => {
                    stabilityStep = parseInt(e.target.dataset.val);
                    bubble.querySelectorAll('.step-option').forEach(o => o.classList.remove('active'));
                    e.target.classList.add('active');
                    updateStabilityBtns();
                    bubble.classList.remove('visible');
                };
            });
        }

        document.addEventListener('click', (e) => {
            if (bubble && !e.target.closest('#step-bubble-stability') && !e.target.closest('.stepper')) {
                bubble.classList.remove('visible');
            }
        });

        if (stabUpBtn) stabUpBtn.onclick = () => { if (!isLongPress) handleStep('stability', 'stability_time', 35, 120, stabilityStep); };
        if (stabDnBtn) stabDnBtn.onclick = () => { if (!isLongPress) handleStep('stability', 'stability_time', 35, 120, -stabilityStep); };

        const timeoutUp = document.getElementById('s-timeout-up');
        const timeoutDn = document.getElementById('s-timeout-dn');
        const threshUp = document.getElementById('s-thresh-up');
        const threshDn = document.getElementById('s-thresh-dn');
        const togExtra = document.getElementById('s-tog-extra');

        if (timeoutUp) timeoutUp.onclick = () => handleStep('timeout', 'timeout', 1, 100, 1);
        if (timeoutDn) timeoutDn.onclick = () => handleStep('timeout', 'timeout', 1, 100, -1);
        if (threshUp) threshUp.onclick = () => handleStep('threshold', 'threshold', 1, 5, 1);
        if (threshDn) threshDn.onclick = () => handleStep('threshold', 'threshold', 1, 5, -1);
        if (togExtra) togExtra.onchange = (e) => markChange('extra_stability', e.target.checked ? 'true' : 'false');

        const modeTrigger = document.getElementById('s-sel-mode-trigger');
        const modePopup = document.getElementById('modePopup');
        const closeModePopup = document.getElementById('closeModePopup');

        if (modeTrigger && modePopup) {
            modeTrigger.onclick = () => {
                const curVal = this.pendingChanges.mode || originals.mode;
                modePopup.querySelectorAll('.mode-option').forEach(opt => {
                    opt.classList.toggle('active', opt.dataset.value === curVal);
                });
                modePopup.classList.add('active');
            };
            if (closeModePopup) closeModePopup.onclick = () => modePopup.classList.remove('active');
            modePopup.onclick = (e) => { if (e.target === modePopup) modePopup.classList.remove('active'); };
            modePopup.querySelectorAll('.mode-option').forEach(opt => {
                opt.onclick = () => {
                    const val = opt.dataset.value;
                    modeTrigger.textContent = val === '1' ? '1 (DM)' : '2 (DMR)';
                    markChange('mode', val);
                    modePopup.classList.remove('active');
                };
            });
        }
    }

    async _discard() {
        this.pendingChanges = {};
        this.updateUI();
        this.pill.hide();
        Utils.showToast('Changes discarded', 'info');
    }

    async _save() {
        this.pill.setSaving(true);
        Utils.showLoadingSpinner(true);
        await Promise.all(Object.keys(this.pendingChanges).map(k => this.updateSettingProp(k, this.pendingChanges[k])));
        this.pendingChanges = {};
        await this.updateModuleDescription();
        this.pill.setSaving(false);
        this.pill.hide();
        Utils.showLoadingSpinner(false);
        Utils.showToast('Settings saved', 'success');
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
        const stability = info.extra_stability || 'false';
        const newDesc = `🛡️ [Mode ${smode} | Threshold: ${threshold} boots | Stability Check: ${stability}] Bootloop Saver Protection For Magisk-KernelSU/Next.`;
        const script = `if grep -q "^description=" "${Config.modulePropPath}"; then sed -i 's~^description=.*~description=${newDesc}~' "${Config.modulePropPath}"; else echo 'description=${newDesc}' >> "${Config.modulePropPath}"; fi`;
        try {
            await Utils.ksuExec(script);
        } catch (error) {
            Utils.updateConsole('Failed to update module description', 'error');
        }
    }
}