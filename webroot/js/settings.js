import { Utils } from './utils.js';
import { AshLooperIcons } from './icons.js';

export class SettingsManager {
    constructor(mainInstance) {
        this.app = mainInstance;
    }

    async loadModuleData() {
        this.app.moduleInfo = {};
        try {
            const modContent = await Utils.ksuExec("cat /data/adb/modules/AshLooper/module.prop");
            this.parsePropContent(modContent);
            try {
                const setContent = await Utils.ksuExec("cat /data/adb/modules/AshLooper/settings.prop");
                this.parsePropContent(setContent);
            } catch (e) {
                Utils.updateConsole('settings.prop not found, using defaults', 'warning');
            }
            Utils.updateConsole('Module info and settings loaded');
        } catch (error) {
            Utils.updateConsole(`Error loading module info: ${error.message}`, 'error');
        }
    }

    parsePropContent(content) {
        const lines = content.split('\n');
        lines.forEach(line => {
            if (line.trim() && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    this.app.moduleInfo[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
    }

    showSettingsModal() {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'settings-modal';

        const header = document.createElement('div');
        header.className = 'settings-modal-header';
        const title = document.createElement('h2');
        title.className = 'settings-modal-title';
        title.textContent = 'AshReXcue Settings';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'settings-modal-close';
        closeBtn.innerHTML = AshLooperIcons.getCloseIcon();
        closeBtn.addEventListener('click', () => Utils.removeModal(modalOverlay));

        header.appendChild(title);
        header.appendChild(closeBtn);

        const settingsContent = document.createElement('div');
        settingsContent.className = 'settings-content';

        const currentTimeout = parseInt(this.app.moduleInfo.timeout) || 29;
        
        const infoFields = [
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
                            this.updateSaveButtonState(pendingChanges, currentTimeout, saveBtn);
                        });

                    } else if (field.type === 'select') {
                        input = document.createElement('select');
                        input.className = 'settings-select';
                        field.options.forEach(opt => {
                            const option = document.createElement('option');
                            option.value = opt;
                            option.textContent = opt === 'true' ? 'Enabled' : 'Disabled';
                            if (this.app.moduleInfo[field.key] === opt) option.selected = true;
                            input.appendChild(option);
                        });
                        inputContainer.appendChild(input);
                        
                        input.addEventListener('change', (e) => {
                            const value = e.target.value;
                            if(this.validateInput(field.key, value, currentTimeout)) {
                                pendingChanges[field.key] = value;
                                errorElement.classList.remove('show');
                            } else {
                                delete pendingChanges[field.key];
                            }
                            this.updateSaveButtonState(pendingChanges, currentTimeout, saveBtn);
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

                        input.addEventListener('input', (e) => {
                            const value = e.target.value;
                            const isValid = this.validateInput(field.key, value, currentTimeout);
                            
                            if (isValid) {
                                pendingChanges[field.key] = value;
                                errorElement.classList.remove('show');
                                e.target.setCustomValidity('');
                            } else {
                                const errorMessage = this.getErrorMessage(field.key, value, currentTimeout);
                                errorElement.textContent = errorMessage;
                                errorElement.classList.add('show');
                                e.target.setCustomValidity(errorMessage);
                                delete pendingChanges[field.key];
                            }
                            this.updateSaveButtonState(pendingChanges, currentTimeout, saveBtn);
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

        saveBtn.addEventListener('click', () => {
            if (!saveBtn.disabled) {
                this.saveSettingsChanges(pendingChanges, currentTimeout, modalOverlay);
            }
        });

        settingsContent.appendChild(saveBtn);
        modalContent.appendChild(header);
        modalContent.appendChild(settingsContent);
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) Utils.removeModal(modalOverlay);
        });
    }

    updateSaveButtonState(pendingChanges, currentTimeout, saveBtn) {
        const hasChanges = Object.keys(pendingChanges).length > 0;
        if (!hasChanges) {
            saveBtn.disabled = true;
            return;
        }
        const allValid = Object.keys(pendingChanges).every(key => 
            this.validateInput(key, pendingChanges[key], currentTimeout)
        );
        saveBtn.disabled = !allValid;
    }

    validateInput(key, value, currentTimeout) {
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

    getErrorMessage(key, value, currentTimeout) {
        const numValue = parseInt(value);
        if (isNaN(numValue) && key !== 'extra_stability') return 'Invalid number';
        if (key === 'timeout') return `Must be between ${currentTimeout - 10} and 300`;
        if (key === 'threshold') return 'Must be 1-5';
        if (key === 'stability_time') return 'Must be 10-25s';
        return 'Invalid value';
    }

    saveSettingsChanges(pendingChanges, currentTimeout, settingsModal) {
        if (pendingChanges.timeout) {
            const newTimeout = parseInt(pendingChanges.timeout);
            const maxDecrease = currentTimeout - 10;
            if (newTimeout < maxDecrease) {
                this.showTimeoutWarning(currentTimeout, maxDecrease, pendingChanges, settingsModal);
                return;
            }
        }
        this.applySettingsChanges(pendingChanges, settingsModal);
    }

    showTimeoutWarning(currentTimeout, maxDecrease, pendingChanges, settingsModal) {
        const warningOverlay = document.createElement('div');
        warningOverlay.className = 'modal-overlay';

        const warningModal = document.createElement('div');
        warningModal.className = 'warning-modal';

        const header = document.createElement('div');
        header.className = 'warning-modal-header';

        const title = document.createElement('h3');
        title.className = 'warning-modal-title';
        title.textContent = 'Timeout Warning';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'warning-modal-close';
        closeBtn.innerHTML = AshLooperIcons.getCloseIcon();
        closeBtn.addEventListener('click', () => Utils.removeModal(warningOverlay));

        header.appendChild(title);
        header.appendChild(closeBtn);

        const content = document.createElement('div');
        content.className = 'warning-modal-content';
        content.innerHTML = `
            You cannot decrease timeout by more than 10 seconds.<br><br>
            <strong>Current timeout:</strong> ${currentTimeout} seconds<br>
            <strong>Minimum allowed:</strong> ${maxDecrease} seconds<br><br>
            Please adjust the timeout value and try again.
        `;

        const buttons = document.createElement('div');
        buttons.className = 'warning-modal-buttons';

        const okBtn = document.createElement('button');
        okBtn.className = 'warning-modal-btn confirm';
        okBtn.textContent = 'OK';
        okBtn.addEventListener('click', () => Utils.removeModal(warningOverlay));

        buttons.appendChild(okBtn);

        warningModal.appendChild(header);
        warningModal.appendChild(content);
        warningModal.appendChild(buttons);
        warningOverlay.appendChild(warningModal);
        document.body.appendChild(warningOverlay);

        warningOverlay.addEventListener('click', (e) => {
            if (e.target === warningOverlay) Utils.removeModal(warningOverlay);
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
                Utils.showToast('Settings saved successfully');
                Utils.removeModal(settingsModal);
                await this.loadModuleData();
            } catch (error) {
                Utils.updateConsole(`Failed to save: ${error.message}`, 'error');
                Utils.showToast(`Failed to save settings`);
            } finally {
                Utils.showLoadingSpinner(false);
            }
        } else {
            Utils.showLoadingSpinner(false);
        }
    }

    async updateSettingProp(key, value) {
        try {
            const settingsPath = "/data/adb/modules/AshLooper/settings.prop";  
            const deleteCmd = `sed -i "/^${key}=/d" "${settingsPath}"`;
            await Utils.ksuExec(deleteCmd);         
            const appendCmd = `echo "${key}=${value}" >> "${settingsPath}"`;
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