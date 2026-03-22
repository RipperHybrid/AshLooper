import { Utils } from './utils.js';
import { Config } from './config.js';

export class SettingsManager {
    constructor(mainInstance) {
        this.app = mainInstance;
        this.knownKeys = [
            'mode', 'loops', 'disable', 'log',
            'timeout', 'threshold', 'stability_time', 'extra_stability',
            'install_date', 'version', 'whitelist'
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
            if (this.app.moduleInfo[key] !== undefined && key !== 'version') {
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
        if (['whitelist', 'log', 'disable', 'mode', 'install_date'].includes(key)) return rawValue;
        if (['timeout', 'threshold', 'stability_time', 'loops'].includes(key)) {
            const num = parseInt(rawValue.replace(/[^0-9-]/g, ''));
            return isNaN(num) ? rawValue : num.toString();
        }
        if (key === 'extra_stability') return rawValue.toLowerCase().includes('true') ? 'true' : 'false';
        return rawValue;
    }

    async loadSettingsTab() {
        this.pendingChanges = {};
        await this.loadModuleData();
        this.updateUI();
        this.bindEvents();
    }

    updateUI() {
        const info = this.app.moduleInfo;
        const modeVal = info.mode || 'none';
        document.getElementById('v-install-date').textContent = info.install_date || '—';
        document.getElementById('v-version').textContent = info.version || '—';
        document.getElementById('v-log').textContent = info.log || '—';
        const vMode = document.getElementById('v-mode');
        vMode.textContent = modeVal;
        vMode.style.background = (modeVal !== 'none' && modeVal !== '0') ? 'rgba(34,211,238,0.1)' : 'rgba(255,176,0,0.08)';
        vMode.style.color = (modeVal !== 'none' && modeVal !== '0') ? 'var(--success)' : 'var(--accent)';

        const t = parseInt(info.timeout) || 60;
        const s = parseInt(info.stability_time) || 80;
        const th = parseInt(info.threshold) || 1;

        document.getElementById('s-val-timeout').textContent = t + 's';
        document.getElementById('s-val-stability').textContent = s + 's';
        document.getElementById('s-num-threshold').textContent = th;
        document.getElementById('d-timeout').textContent = `Max wait: ${Math.max(1, t - 10)}–100s`;
        document.getElementById('s-tog-extra').checked = info.extra_stability === 'true';
        this.refreshButtonStates(t, s, th);
    }

    refreshButtonStates(t, s, th) {
        const info = this.app.moduleInfo;
        const minT = Math.max(1, (parseInt(info.timeout) || 60) - 10);
        document.getElementById('s-timeout-dn').disabled = t <= minT;
        document.getElementById('s-timeout-up').disabled = t >= 100;
        document.getElementById('s-stability-dn').disabled = s <= 35;
        document.getElementById('s-stability-up').disabled = s >= 120;
        document.getElementById('s-thresh-dn').disabled = th <= 1;
        document.getElementById('s-thresh-up').disabled = th >= 5;
    }

    bindEvents() {
        const info = this.app.moduleInfo;
        const originals = {
            timeout: (parseInt(info.timeout) || 60).toString(),
            stability_time: (parseInt(info.stability_time) || 80).toString(),
            threshold: (parseInt(info.threshold) || 1).toString(),
            extra_stability: info.extra_stability === 'true' ? 'true' : 'false'
        };

        const updateBar = () => {
            const count = Object.keys(this.pendingChanges).length;
            const footer = document.getElementById('s-footer');
            if (!footer) return;
            document.getElementById('s-change-count').textContent = count;
            document.getElementById('s-change-s').textContent = count === 1 ? '' : 's';
            if (count > 0) footer.classList.remove('hidden');
            else footer.classList.add('hidden');
        };

        const markChange = (key, value) => {
            if (value === originals[key]) delete this.pendingChanges[key];
            else this.pendingChanges[key] = value;
            updateBar();
        };

        const handleStep = (id, key, min, max, delta) => {
            const el = document.getElementById(`s-val-${id}`) || document.getElementById(`s-num-threshold`);
            let cur = parseInt(el.textContent);
            let next = Math.max(min, Math.min(max, cur + delta));
            el.textContent = id === 'threshold' ? next : next + 's';
            this.refreshButtonStates(
                key === 'timeout' ? next : parseInt(document.getElementById('s-val-timeout').textContent),
                key === 'stability_time' ? next : parseInt(document.getElementById('s-val-stability').textContent),
                key === 'threshold' ? next : parseInt(document.getElementById('s-num-threshold').textContent)
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
            stabUpBtn.textContent = `+${stabilityStep}`;
            stabDnBtn.textContent = `-${stabilityStep}`;
        };

        const startPress = () => {
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                bubble.classList.add('visible');
                if ('vibrate' in navigator) navigator.vibrate(50);
            }, 400);
        };

        const cancelPress = () => {
            clearTimeout(pressTimer);
        };

        [stabUpBtn, stabDnBtn].forEach(btn => {
            btn.addEventListener('mousedown', startPress);
            btn.addEventListener('touchstart', startPress, {passive: true});
            btn.addEventListener('mouseup', cancelPress);
            btn.addEventListener('mouseleave', cancelPress);
            btn.addEventListener('touchend', cancelPress);
            btn.addEventListener('touchcancel', cancelPress);
            btn.addEventListener('touchmove', cancelPress, {passive: true});
        });

        bubble.querySelectorAll('.step-option').forEach(opt => {
            opt.onclick = (e) => {
                stabilityStep = parseInt(e.target.dataset.val);
                bubble.querySelectorAll('.step-option').forEach(o => o.classList.remove('active'));
                e.target.classList.add('active');
                updateStabilityBtns();
                bubble.classList.remove('visible');
            };
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#step-bubble-stability') && !e.target.closest('.stepper')) {
                bubble.classList.remove('visible');
            }
        });

        stabUpBtn.onclick = (e) => {
            if (isLongPress) return;
            handleStep('stability', 'stability_time', 35, 120, stabilityStep);
        };

        stabDnBtn.onclick = (e) => {
            if (isLongPress) return;
            handleStep('stability', 'stability_time', 35, 120, -stabilityStep);
        };

        document.getElementById('s-timeout-up').onclick = () => handleStep('timeout', 'timeout', 1, 100, 1);
        document.getElementById('s-timeout-dn').onclick = () => handleStep('timeout', 'timeout', 1, 100, -1);
        document.getElementById('s-thresh-up').onclick = () => handleStep('threshold', 'threshold', 1, 5, 1);
        document.getElementById('s-thresh-dn').onclick = () => handleStep('threshold', 'threshold', 1, 5, -1);

        document.getElementById('s-tog-extra').onchange = (e) => markChange('extra_stability', e.target.checked ? 'true' : 'false');

        document.getElementById('s-btn-discard').onclick = () => {
            this.pendingChanges = {};
            this.updateUI();
            updateBar();
            Utils.showToast('Changes discarded', 'info');
        };

        document.getElementById('s-btn-save').onclick = async () => {
            const btn = document.getElementById('s-btn-save');
            btn.disabled = true;
            Utils.showLoadingSpinner(true);
            await Promise.all(Object.keys(this.pendingChanges).map(k => this.updateSettingProp(k, this.pendingChanges[k])));
            Object.assign(originals, this.pendingChanges);
            this.pendingChanges = {};
            btn.disabled = false;
            Utils.showLoadingSpinner(false);
            Utils.showToast('Settings saved', 'success');
            updateBar();
        };
    }

    async updateSettingProp(key, value) {
        const script = `if grep -q "^${key}=" "${Config.settingsPropPath}"; then sed -i 's~^${key}=.*~${key}=${value}~' "${Config.settingsPropPath}"; else echo '${key}=${value}' >> "${Config.settingsPropPath}"; fi`;
        await Utils.ksuExec(script);
        this.app.moduleInfo[key] = value;
    }
}