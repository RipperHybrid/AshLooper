import { Utils } from './utils.js';
import { AshLooperIcons } from './icons.js';
import { Config } from './config.js';

export class SettingsManager {
    constructor(mainInstance) {
        this.app = mainInstance;
        this.knownKeys = [
            'mode', 'loops', 'disable', 'log', 'check_ss', 'check_sf',
            'timeout', 'threshold', 'stability_time', 'extra_stability',
            'install_date', 'version'
        ];
    }

    async loadModuleData() {
        this.app.moduleInfo = {};
        try {
            const modContent = await Utils.ksuExec(`cat "${Config.modulePropPath}"`);
            this.parsePropContent(modContent);

            try {
                const rawContent = await Utils.ksuExec(`cat "${Config.settingsPropPath}"`);

                const sanitizedContent = this.preProcessContent(rawContent);

                this.parsePropContent(sanitizedContent);

                if (this.detectCorruption(rawContent, sanitizedContent)) {
                    Utils.updateConsole('Corruption detected in settings.prop, repairing...', 'warning');
                    await this.repairSettingsFile();
                }
            } catch (e) {
                Utils.updateConsole('settings.prop not found, using defaults', 'warning');
            }
            Utils.updateConsole('Module info and settings loaded');
        } catch (error) {
            Utils.updateConsole(`Error loading module info: ${error.message}`, 'error');
        }
    }

    preProcessContent(content) {
        let processed = content;
        this.knownKeys.forEach(key => {
            const regex = new RegExp(`(?<!^|\\n)(${key}=)`, 'g');
            processed = processed.replace(regex, '\n$1');
        });
        return processed;
    }

    detectCorruption(original, sanitized) {
        if (original !== sanitized) return true;

        const lines = sanitized.split('\n');
        return lines.some(line => {
            if (!line.trim() || line.startsWith('#')) return false;
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const rawVal = parts.slice(1).join('=').trim();

                const cleanVal = this.cleanValue(key, rawVal);
                return rawVal !== cleanVal;
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
        Utils.updateConsole('Settings file repaired successfully', 'success');
    }

    parsePropContent(content) {
        const lines = content.split('\n');
        lines.forEach(line => {
            if (line.trim() && !line.startsWith('#')) {
                const parts = line.split('=');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const rawValue = parts.slice(1).join('=').trim();
                    this.app.moduleInfo[key] = this.cleanValue(key, rawValue);
                }
            }
        });
    }

    cleanValue(key, rawValue) {
        if (['timeout', 'threshold', 'stability_time', 'mode', 'loops'].includes(key)) {
            const num = parseInt(rawValue.replace(/[^0-9]/g, ''));
            return isNaN(num) ? rawValue : num.toString();
        }

        if (['check_ss', 'check_sf', 'extra_stability'].includes(key)) {
            return rawValue.includes('true') ? 'true' : 'false';
        }

        if (key === 'install_date') {
            const match = rawValue.match(/^(\d{4}-\d{2}-\d{2})/);
            if (match) return match[1];
            return rawValue;
        }

        return rawValue;
    }

    async loadSettingsTab() {
        const settingsContainer = document.querySelector('.settings-container');
        if (!settingsContainer) return;

        settingsContainer.innerHTML = '';

        await this.loadModuleData();

        const header = document.createElement('div');
        header.className = 'settings-header';
        header.innerHTML = '<h2>AshReXcue Settings</h2>';

        const settingsContent = document.createElement('div');
        settingsContent.className = 'settings-content';

        const currentTimeout = parseInt(this.app.moduleInfo.timeout) || 29;

        const infoFields = [
            { key: 'install_date', label: 'Install Date', editable: false },
            { key: 'version', label: 'Module Version', editable: false },
            { key: 'timeout', label: 'Timeout (seconds)', editable: true, type: 'number', min: currentTimeout - 10, max: 300, step: 1, description: `Range: ${Math.max(1, currentTimeout - 10)} - 300 seconds` },
            { key: 'threshold', label: 'Threshold', editable: true, type: 'number', min: 1, max: 5, step: 1, description: 'Range: 1-5 (boots before protection)' },
            { key: 'stability_time', label: 'Stability Time', editable: true, type: 'number', min: 10, max: 25, step: 1, description: 'Range: 10 - 25 seconds' },
            { key: 'extra_stability', label: 'Extra Stability Checks', editable: true, type: 'toggle', description: 'Monitor critical processes (system_server, surfaceflinger)' }
        ];

        const pendingChanges = {};

        infoFields.forEach(field => {
            if (this.app.moduleInfo[field.key] !== undefined || field.editable) {
                const fieldDiv = document.createElement('div');
                fieldDiv.className = 'settings-field';
                fieldDiv.dataset.fieldKey = field.key;

                const label = document.createElement('div');
                label.className = 'settings-label';
                label.textContent = field.label;

                if (field.editable && field.description) {
                    const desc = document.createElement('div');
                    desc.className = 'settings-description';
                    desc.textContent = field.description;
                    label.appendChild(desc);
                }

                const valueDiv = document.createElement('div');

                if (field.editable) {
                    const inputContainer = document.createElement('div');
                    inputContainer.className = 'settings-input-container';

                    let input;
                    const errorElement = document.createElement('div');
                    errorElement.className = 'input-error';
                    errorElement.id = `${field.key}-error`;

                    if (field.type === 'toggle') {
                        valueDiv.style.display = 'flex';
                        valueDiv.style.alignItems = 'center';

                        const switchLabel = document.createElement('label');
                        switchLabel.className = 'switch';

                        input = document.createElement('input');
                        input.type = 'checkbox';
                        input.checked = this.app.moduleInfo[field.key] === 'true';

                        const slider = document.createElement('span');
                        slider.className = 'slider round';

                        switchLabel.appendChild(input);
                        switchLabel.appendChild(slider);
                        inputContainer.appendChild(switchLabel);

                        input.addEventListener('change', (e) => {
                            pendingChanges[field.key] = e.target.checked ? 'true' : 'false';
                            this.updateSettingsSaveButton(pendingChanges, currentTimeout, saveBtn);
                        });

                    } else {
                        input = document.createElement('input');
                        input.type = field.type || 'text';
                        input.className = 'settings-input';
                        input.value = this.app.moduleInfo[field.key] || (field.key === 'threshold' ? '3' : '29');

                        if (field.min !== undefined) input.min = field.min;
                        if (field.max !== undefined) input.max = field.max;
                        if (field.step !== undefined) input.step = field.step;
                        if (field.type === 'number') input.required = true;

                        inputContainer.appendChild(input);

                        input.addEventListener('focus', (e) => {
                            setTimeout(() => {
                                const field = e.target.closest('.settings-field');
                                if (field) {
                                    field.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                            }, 300);
                        });

                        input.addEventListener('input', (e) => {
                            const value = e.target.value;
                            const isValid = this.validateSettingInput(field.key, value, currentTimeout);

                            if (isValid) {
                                pendingChanges[field.key] = value;
                                errorElement.classList.remove('show');
                                e.target.setCustomValidity('');
                            } else {
                                const errorMessage = this.getSettingErrorMessage(field.key, value, currentTimeout);
                                errorElement.textContent = errorMessage;
                                errorElement.classList.add('show');
                                e.target.setCustomValidity(errorMessage);
                                delete pendingChanges[field.key];
                            }
                            this.updateSettingsSaveButton(pendingChanges, currentTimeout, saveBtn);
                        });
                    }

                    inputContainer.appendChild(errorElement);
                    valueDiv.appendChild(inputContainer);
                } else {
                    valueDiv.className = 'settings-value';
                    valueDiv.textContent = this.app.moduleInfo[field.key] || 'N/A';
                }

                fieldDiv.appendChild(label);
                fieldDiv.appendChild(valueDiv);
                settingsContent.appendChild(fieldDiv);
            }
        });

        const saveBtn = document.createElement('button');
        saveBtn.className = 'settings-save-btn';
        saveBtn.textContent = 'Save Changes';
        saveBtn.disabled = true;

        saveBtn.addEventListener('click', async () => {
            if (!saveBtn.disabled) {
                await this.applySettingsChanges(pendingChanges, null);
                Object.keys(pendingChanges).forEach(key => delete pendingChanges[key]);
                saveBtn.disabled = true;
                this.updateSettingsDisplay();
            }
        });

        settingsContent.appendChild(saveBtn);
        settingsContainer.appendChild(header);
        settingsContainer.appendChild(settingsContent);
    }

    validateSettingInput(key, value, currentTimeout) {
        if (key === 'extra_stability') return value === 'true' || value === 'false';

        const numValue = parseInt(value);
        if (isNaN(numValue)) return false;

        switch (key) {
            case 'timeout':
                const minTimeout = currentTimeout - 10;
                return numValue >= minTimeout && numValue <= 300;
            case 'threshold':
                return numValue >= 1 && numValue <= 5;
            case 'stability_time':
                return numValue >= 10 && numValue <= 25;
            default:
                return true;
        }
    }

    getSettingErrorMessage(key, value, currentTimeout) {
        const numValue = parseInt(value);
        if (isNaN(numValue) && key !== 'extra_stability') return 'Invalid number';
        if (key === 'timeout') return `Must be between ${currentTimeout - 10} and 300`;
        if (key === 'threshold') return 'Must be 1-5';
        if (key === 'stability_time') return 'Must be 10-25s';
        return 'Invalid value';
    }

    updateSettingsSaveButton(pendingChanges, currentTimeout, saveBtn) {
        const hasChanges = Object.keys(pendingChanges).length > 0;
        if (!hasChanges) {
            saveBtn.disabled = true;
            return;
        }
        const allValid = Object.keys(pendingChanges).every(key =>
            this.validateSettingInput(key, pendingChanges[key], currentTimeout)
        );
        saveBtn.disabled = !allValid;
    }

    updateSettingsDisplay() {
        const fields = [
            { key: 'install_date', type: 'text' },
            { key: 'version', type: 'text' },
            { key: 'timeout', type: 'number' },
            { key: 'threshold', type: 'number' },
            { key: 'stability_time', type: 'number' },
            { key: 'extra_stability', type: 'toggle' }
        ];

        fields.forEach(field => {
            const input = document.querySelector(`#${field.key}-error`)?.parentNode?.querySelector('input, select');
            if (input) {
                if (field.type === 'toggle') {
                    input.checked = this.app.moduleInfo[field.key] === 'true';
                } else {
                    input.value = this.app.moduleInfo[field.key] || '';
                }
            } else {
                const valueDiv = document.querySelector(`.settings-field:has(#${field.key}-error) .settings-value`);
                if (valueDiv) {
                    valueDiv.textContent = this.app.moduleInfo[field.key] || 'N/A';
                }
            }
        });
    }

    async applySettingsChanges(pendingChanges, settingsModal) {
        Utils.showLoadingSpinner(true);
        const promises = [];

        Object.keys(pendingChanges).forEach(key => {
            if (pendingChanges[key] !== undefined && pendingChanges[key] !== this.app.moduleInfo[key]) {
                promises.push(this.updateSettingProp(key, pendingChanges[key]));
            }
        });

        if (promises.length > 0) {
            try {
                await Promise.all(promises);
                Utils.updateConsole('Settings saved successfully', 'success');
                Utils.showToast('Settings saved successfully', 'success');
                if (settingsModal) Utils.removeModal(settingsModal);
                await this.loadModuleData();
            } catch (error) {
                Utils.updateConsole(`Failed to save: ${error.message}`, 'error');
                Utils.showToast(`Failed to save settings`, 'error');
            } finally {
                Utils.showLoadingSpinner(false);
            }
        } else {
            Utils.showLoadingSpinner(false);
        }
    }

    async updateSettingProp(key, value) {
        try {
            const deleteCmd = `sed -i "/^${key}=/d" "${Config.settingsPropPath}"`;
            await Utils.ksuExec(deleteCmd);
            const appendCmd = `echo "${key}=${value}" >> "${Config.settingsPropPath}"`;
            const result = await Utils.ksuExec(appendCmd);
            this.app.moduleInfo[key] = value;
            Utils.updateConsole(`Updated ${key} to ${value}`, 'success');
            return result;
        } catch (error) {
            Utils.updateConsole(`Failed to update ${key}: ${error.message}`, 'error');
            throw error;
        }
    }
}