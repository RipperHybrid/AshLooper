class AshLooperWebUI {
    constructor() {
        this.currentLogFile = null;
        this.logFiles = [];
        this.isDarkMode = true;
        this.logDirectory = '/cache/looper/';
        this.searchQuery = '';
        this.originalLines = [];
        this.modulePropPath = '/data/adb/modules/AshLooper/module.prop';
        this.moduleInfo = {};
        this.init();
    }

    init() {
        this.loadTheme();
        this.setupEventListeners();
        this.loadLogFiles();
        this.loadModuleInfo();
        this.setupRefreshButton();
        this.updateConsole('AshLooper WebUI initialized');
        this.updateConsole('Monitoring For Loops...');
    }

    setupRefreshButton() {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.innerHTML = AshLooperIcons.getRefreshIcon() + ' Refresh';
        }
    }

    setupEventListeners() {
        const themeToggle = document.getElementById('themeToggle');
        themeToggle.innerHTML = AshLooperIcons.getNightModeIcon();
        themeToggle.addEventListener('click', () => this.toggleTheme());
        
        const fileSelectBtn = document.getElementById('fileSelectBtn');
        const closePopup = document.querySelector('.close-popup');
        const popupOverlay = document.getElementById('filePopup');

        fileSelectBtn.addEventListener('click', () => this.togglePopup());
        closePopup.addEventListener('click', () => this.closePopup());
        popupOverlay.addEventListener('click', (e) => {
            if (e.target === popupOverlay) {
                this.closePopup();
            }
        });

        const terminalControls = document.querySelector('.terminal-controls');
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Filter logs...';
        searchInput.className = 'search-input';
        searchInput.style.display = 'none';
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            if (this.currentLogFile) {
                this.displayLogContent(this.originalLines);
            }
        });
        terminalControls.insertBefore(searchInput, terminalControls.firstChild);

        const saveBtn = document.createElement('button');
        saveBtn.innerHTML = AshLooperIcons.getSaveIcon();
        saveBtn.className = 'control-btn save-btn';
        saveBtn.title = 'Save to Downloads';
        saveBtn.style.display = 'none';
        saveBtn.addEventListener('click', () => this.saveToDownload());
        terminalControls.appendChild(saveBtn);

        const copyBtn = document.createElement('button');
        copyBtn.innerHTML = AshLooperIcons.getCopyIcon();
        copyBtn.className = 'control-btn copy-btn';
        copyBtn.title = 'Copy Logs';
        copyBtn.style.display = 'none';
        copyBtn.addEventListener('click', () => this.copyToClipboard());
        terminalControls.appendChild(copyBtn);

        const clearBtn = document.createElement('button');
        clearBtn.innerHTML = AshLooperIcons.getClearIcon();
        clearBtn.className = 'control-btn clear-btn';
        clearBtn.title = 'Clear Terminal';
        clearBtn.style.display = 'none';
        clearBtn.addEventListener('click', () => this.clearViewer());
        terminalControls.appendChild(clearBtn);

        const settingsBtn = document.createElement('button');
        settingsBtn.innerHTML = AshLooperIcons.getSettingsIcon();
        settingsBtn.className = 'control-btn settings-btn';
        settingsBtn.title = 'Module Settings';
        settingsBtn.addEventListener('click', () => this.openSettings());
        terminalControls.appendChild(settingsBtn);
    }

    async loadModuleInfo() {
        try {
            const content = await this.ksuExec(`cat "${this.modulePropPath}"`);
            this.parseModuleProp(content);
            this.updateConsole('Module info loaded');
        } catch (error) {
            this.updateConsole(`Error loading module info: ${error.message}`, 'error');
            this.moduleInfo = {};
        }
    }

    parseModuleProp(content) {
        this.moduleInfo = {};
        const lines = content.split('\n');
        
        lines.forEach(line => {
            if (line.trim() && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    this.moduleInfo[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
    }

    openSettings() {
        this.showSettingsModal();
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
        title.textContent = 'AshLooper Settings';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'settings-modal-close';
        closeBtn.innerHTML = AshLooperIcons.getCloseIcon();
        closeBtn.addEventListener('click', () => {
            modalOverlay.style.animation = 'fadeOut 0.3s ease-out forwards';
            modalContent.style.animation = 'scaleOut 0.3s ease-out forwards';
            setTimeout(() => {
                if (modalOverlay.parentNode) {
                    modalOverlay.parentNode.removeChild(modalOverlay);
                }
            }, 300);
        });

        header.appendChild(title);
        header.appendChild(closeBtn);

        const settingsContent = document.createElement('div');
        settingsContent.className = 'settings-content';

        const currentTimeout = parseInt(this.moduleInfo.timeout) || 29;
        const warningDiv = document.createElement('div');
        warningDiv.className = 'settings-warning';
        warningDiv.innerHTML = `
            <div class="warning-icon">⚠️</div>
            <div class="warning-text">
                <strong>Important:</strong> Timeout can only be decreased by maximum 10 seconds from current value.
                Current timeout: <strong>${currentTimeout} seconds</strong>
            </div>
        `;
        settingsContent.appendChild(warningDiv);

        const infoFields = [
            { key: 'version', label: 'Module Version', editable: false },
            { 
                key: 'timeout', 
                label: 'Timeout (seconds)', 
                editable: true,
                description: `Can decrease max 10 seconds from current value (${currentTimeout})`
            },
            { 
                key: 'threshold', 
                label: 'Threshold', 
                editable: true,
                description: 'Number of boot loops before protection activates'
            }
        ];

        const pendingChanges = {};

        infoFields.forEach(field => {
            if (this.moduleInfo[field.key]) {
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
                    
                    const input = document.createElement('input');
                    input.type = 'number';
                    input.className = 'settings-input';
                    input.value = this.moduleInfo[field.key];
                    
                    if (field.key === 'timeout') {
                        input.min = currentTimeout - 10;
                        input.max = 300;
                    } else if (field.key === 'threshold') {
                        input.min = 1;
                        input.max = 10;
                    }
                    
                    input.addEventListener('input', (e) => {
                        pendingChanges[field.key] = e.target.value;
                    });
                    
                    inputContainer.appendChild(input);
                    valueDiv.appendChild(inputContainer);
                } else {
                    valueDiv.className = 'settings-value';
                    valueDiv.textContent = this.moduleInfo[field.key];
                }

                fieldDiv.appendChild(label);
                fieldDiv.appendChild(valueDiv);
                settingsContent.appendChild(fieldDiv);
            }
        });

        const saveBtn = document.createElement('button');
        saveBtn.className = 'settings-save-btn';
        saveBtn.textContent = 'Save Changes';
        saveBtn.addEventListener('click', () => {
            this.saveSettingsChanges(pendingChanges, currentTimeout, modalOverlay);
        });

        settingsContent.appendChild(saveBtn);
        modalContent.appendChild(header);
        modalContent.appendChild(settingsContent);
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeBtn.click();
            }
        });
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
        closeBtn.addEventListener('click', () => {
            warningOverlay.style.animation = 'fadeOut 0.3s ease-out forwards';
            warningModal.style.animation = 'scaleOut 0.3s ease-out forwards';
            setTimeout(() => {
                if (warningOverlay.parentNode) {
                    warningOverlay.parentNode.removeChild(warningOverlay);
                }
            }, 300);
        });

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
        okBtn.addEventListener('click', () => {
            warningOverlay.style.animation = 'fadeOut 0.3s ease-out forwards';
            warningModal.style.animation = 'scaleOut 0.3s ease-out forwards';
            setTimeout(() => {
                if (warningOverlay.parentNode) {
                    warningOverlay.parentNode.removeChild(warningOverlay);
                }
            }, 300);
        });

        buttons.appendChild(okBtn);

        warningModal.appendChild(header);
        warningModal.appendChild(content);
        warningModal.appendChild(buttons);
        warningOverlay.appendChild(warningModal);
        document.body.appendChild(warningOverlay);

        warningOverlay.addEventListener('click', (e) => {
            if (e.target === warningOverlay) {
                closeBtn.click();
            }
        });
    }

    applySettingsChanges(pendingChanges, settingsModal) {
        const promises = [];
        
        Object.keys(pendingChanges).forEach(key => {
            if (pendingChanges[key] !== undefined && pendingChanges[key] !== this.moduleInfo[key]) {
                promises.push(this.updateModuleProp(key, pendingChanges[key]));
            }
        });
        
        if (promises.length > 0) {
            Promise.all(promises).then(() => {
                this.updateConsole('All settings saved successfully', 'success');
                settingsModal.style.animation = 'fadeOut 0.3s ease-out forwards';
                setTimeout(() => {
                    if (settingsModal.parentNode) {
                        settingsModal.parentNode.removeChild(settingsModal);
                    }
                }, 300);
            }).catch(error => {
                this.updateConsole(`Failed to save settings: ${error.message}`, 'error');
            });
        } else {
            this.updateConsole('No changes to save', 'info');
        }
    }

    async updateModuleProp(key, value) {
        try {
            const currentContent = await this.ksuExec(`cat "${this.modulePropPath}"`);
            const lines = currentContent.split('\n');
            
            const updatedLines = lines.map(line => {
                if (line.startsWith(`${key}=`)) {
                    return `${key}=${value}`;
                }
                return line;
            });

            const tempPath = '/data/local/tmp/module.prop.tmp';
            await this.ksuExec(`echo "${updatedLines.join('\n')}" > "${tempPath}"`);
            await this.ksuExec(`cp "${tempPath}" "${this.modulePropPath}"`);
            await this.ksuExec(`rm "${tempPath}"`);

            this.moduleInfo[key] = value;
            
            this.updateConsole(`Updated ${key} to ${value}`, 'success');
        } catch (error) {
            this.updateConsole(`Failed to update ${key}: ${error.message}`, 'error');
        }
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        document.body.classList.toggle('dark-mode', this.isDarkMode);
        document.body.classList.toggle('light-mode', !this.isDarkMode);

        const themeBtn = document.getElementById('themeToggle');
        themeBtn.innerHTML = this.isDarkMode ? AshLooperIcons.getNightModeIcon() : AshLooperIcons.getLightModeIcon();

        localStorage.setItem('ashlooper-theme', this.isDarkMode ? 'dark' : 'light');
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('ashlooper-theme') || 'dark';
        this.isDarkMode = savedTheme === 'dark';
        document.body.classList.add(this.isDarkMode ? 'dark-mode' : 'light-mode');

        const themeBtn = document.getElementById('themeToggle');
        themeBtn.innerHTML = this.isDarkMode ? AshLooperIcons.getNightModeIcon() : AshLooperIcons.getLightModeIcon();
    }

    togglePopup() {
        const popup = document.getElementById('filePopup');
        popup.classList.toggle('active');
    }

    closePopup() {
        const popup = document.getElementById('filePopup');
        popup.classList.remove('active');
    }

    ksuExec(command) {
        return new Promise((resolve, reject) => {
            const callbackName = `exec_callback_${Date.now()}`;
            window[callbackName] = (errno, stdout, stderr) => {
                delete window[callbackName];
                if (errno !== 0) {
                    reject(new Error(`Command failed: ${stderr}`));
                    return;
                }
                resolve(stdout);
            };
            try {
                ksu.exec(command, "{}", callbackName);
            } catch (error) {
                delete window[callbackName];
                reject(error);
            }
        });
    }

    async loadLogFiles() {
        this.showLoadingSpinner(true);
        try {
            const result = await this.ksuExec(`ls -1 "${this.logDirectory}"`);
            this.logFiles = result.split('\n')
                .filter(file => file.trim() && file.includes('AshLooper'))
                .sort();
            this.renderFileList();
            this.updateConsole('Log files loaded');
        } catch (error) {
            this.updateConsole(`Error loading log files: ${error.message}`, 'error');
            this.logFiles = [];
            this.renderFileList();
        } finally {
            this.showLoadingSpinner(false);
        }
    }

    renderFileList() {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        if (this.logFiles.length === 0) {
            fileList.innerHTML = '<div class="file-item">No log files found</div>';
            return;
        }

        this.logFiles.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.textContent = file;
            fileItem.addEventListener('click', () => this.selectFile(file));
            fileList.appendChild(fileItem);
        });
    }

    async selectFile(filename) {
        this.currentLogFile = filename;
        this.updateSelectedFile();
        this.closePopup();

        const fileBtn = document.getElementById('fileSelectBtn');
        fileBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            fileBtn.style.transform = 'translateY(-3px)';
        }, 150);

        this.updateConsole(`Reading: ${this.logDirectory}${filename}`);
        this.showLoadingSpinner(true);

        try {
            const content = await this.ksuExec(`cat "${this.logDirectory}${filename}"`);
            this.originalLines = content.split('\n').filter(line => line.trim() !== '');
            this.displayLogContent(this.originalLines);
            this.updateConsole(`Loaded ${this.originalLines.length} lines`);
        } catch (error) {
            this.updateConsole(`Error reading file: ${error.message}`, 'error');
            this.originalLines = [`Error reading file: ${error.message}`];
            this.displayLogContent(this.originalLines);
        } finally {
            this.showLoadingSpinner(false);
        }
    }

    updateSelectedFile() {
        const fileNameElement = document.getElementById('selectedFileName');
        const searchInput = document.querySelector('.search-input');
        const saveBtn = document.querySelector('.save-btn');
        const copyBtn = document.querySelector('.copy-btn');
        const clearBtn = document.querySelector('.clear-btn');

        if (this.currentLogFile) {
            fileNameElement.textContent = this.currentLogFile;
            searchInput.style.display = 'block';
            saveBtn.style.display = 'flex';
            copyBtn.style.display = 'flex';
            clearBtn.style.display = 'flex';
        } else {
            fileNameElement.textContent = '';
            searchInput.style.display = 'none';
            saveBtn.style.display = 'none';
            copyBtn.style.display = 'none';
            clearBtn.style.display = 'none';
        }
    }

    displayLogContent(lines) {
        const terminalOutput = document.getElementById('terminalOutput');
        terminalOutput.innerHTML = '';

        if (lines.length === 0) {
            terminalOutput.innerHTML = '<div class="terminal-line">[Empty file]</div>';
            return;
        }

        const filteredLines = this.searchQuery
            ? lines.filter(line => line.toLowerCase().includes(this.searchQuery))
            : lines;

        filteredLines.forEach(line => {
            const lineElement = document.createElement('div');
            lineElement.className = 'terminal-line';

            if (line.includes('ERROR') || line.includes('FAILED')) {
                lineElement.classList.add('error');
            } else if (line.includes('WARNING') || line.includes('CAUTION')) {
                lineElement.classList.add('warning');
            } else if (line.includes('SUCCESS') || line.includes('COMPLETED') || line.includes('OK')) {
                lineElement.classList.add('success');
            } else if (line.includes('INFO') || line.includes('STARTED') || line.includes('RUNNING')) {
                lineElement.classList.add('info');
            }

            lineElement.textContent = line;
            terminalOutput.appendChild(lineElement);
        });
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    async saveToDownload() {
        if (!this.currentLogFile) {
            this.updateConsole('No log file selected', 'error');
            return;
        }

        this.showLoadingSpinner(true);
        try {
            this.updateConsole(`Saving to Downloads...`);
            const source = `${this.logDirectory}${this.currentLogFile}`;
            const dest = `/storage/emulated/0/Download/${this.currentLogFile}`;
            await this.ksuExec(`cp "${source}" "${dest}"`);
            this.updateConsole(`Saved to /storage/emulated/0/Download/`);
        } catch (error) {
            this.updateConsole(`Save failed: ${error.message}`, 'error');
        } finally {
            this.showLoadingSpinner(false);
        }
    }

    async copyToClipboard() {
        const terminalOutput = document.getElementById('terminalOutput');
        const lines = Array.from(terminalOutput.querySelectorAll('.terminal-line'))
            .map(line => line.textContent)
            .join('\n');
        
        try {
            await navigator.clipboard.writeText(lines);
            this.updateConsole('Logs copied to clipboard', 'success');
        } catch (error) {
            this.updateConsole(`Failed to copy logs: ${error.message}`, 'error');
        }
    }

    showLoadingSpinner(show) {
        let spinner = document.querySelector('.loading-spinner');
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            spinner.innerHTML = '<div class="spinner"></div>';
            document.querySelector('.terminal-container').appendChild(spinner);
        }
        spinner.style.display = show ? 'flex' : 'none';
    }

    refreshLogs() {
        this.updateConsole('Refreshing file list...');
        this.loadLogFiles();
    }

    clearViewer() {
        if (!this.currentLogFile) {
            this.updateConsole('No log file selected', 'error');
            return;
        }
        
        document.getElementById('terminalOutput').innerHTML = 
            '<div class="welcome-message">' +
            '<div>AshLooper WebUI V1.0</div>' +
            '<div>Select a log file to view contents</div>' +
            '</div>';
        this.searchQuery = '';
        document.querySelector('.search-input').value = '';
        this.originalLines = [];
        this.currentLogFile = null;
        this.updateSelectedFile();
        this.updateConsole('Terminal cleared');
    }

    updateConsole(message, type = 'info') {
        const terminalOutput = document.getElementById('terminalOutput');
        const lineElement = document.createElement('div');
        lineElement.className = `terminal-line ${type}`;
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: true });
        lineElement.textContent = `[${timestamp}] ${message}`;
        terminalOutput.appendChild(lineElement);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.ashLooperUI = new AshLooperWebUI();
});

function refreshLogs() { window.ashLooperUI.refreshLogs(); }
function saveToDownload() { window.ashLooperUI.saveToDownload(); }
function clearViewer() { window.ashLooperUI.clearViewer(); }