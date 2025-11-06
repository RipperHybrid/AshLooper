class AshLooperWebUI {
    constructor() {
        this.currentLogFile = null;
        this.logFiles = [];
        this.isDarkMode = true;
        this.currentTheme = 'dark';
        this.themes = [
            { name: 'dark', label: 'Dark (Default)' },
            { name: 'light', label: 'Light' },
            { name: 'retro', label: 'Retro (Amber)' }
        ];
        this.logDirectory = '/cache/looper/';
        this.searchQuery = '';
        this.originalLines = [];
        this.modulePropPath = '/data/adb/modules/AshLooper/module.prop';
        this.moduleInfo = {};
        this.bootSessions = [];
        this.currentSessionIndex = -1;
        this.init();
    }

    init() {
        this.loadTheme();
        this.setupEventListeners();
        this.loadLogFiles();
        this.loadModuleInfo();
        this.setupRefreshButton();
        this.updateConsole('AshReXcue WebUI initialized');
        this.updateConsole('Monitoring For Loops...');
        ksu.toast("Your friendly neighborhood root savior.");
    }

    setupRefreshButton() {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.innerHTML = AshLooperIcons.getRefreshIcon() + ' Refresh';
        }
    }

    setupEventListeners() {
        const themeToggle = document.getElementById('themeToggle');
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
                this.displayLogContent(this.getCurrentSessionLines());
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

        const sessionBtn = document.createElement('button');
        sessionBtn.innerHTML = '📋 Sessions';
        sessionBtn.className = 'control-btn session-btn';
        sessionBtn.title = 'Select Boot Session';
        sessionBtn.style.display = 'none';
        sessionBtn.addEventListener('click', () => this.showSessionSelector());
        terminalControls.appendChild(sessionBtn);

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

    applyTheme(themeName) {
        this.themes.forEach(theme => {
            document.body.classList.remove(`${theme.name}-mode`);
        });
        
        document.body.classList.add(`${themeName}-mode`);
        this.currentTheme = themeName;
        
        this.isDarkMode = (themeName !== 'light');
        
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            if (themeName === 'light') {
                themeBtn.innerHTML = AshLooperIcons.getLightModeIcon();
            } else if (themeName === 'retro') {
                themeBtn.innerHTML = AshLooperIcons.getRetroIcon();
            } else {
                themeBtn.innerHTML = AshLooperIcons.getNightModeIcon();
            }
        }
    }

    changeTheme(themeName) {
        this.applyTheme(themeName);
        localStorage.setItem('ashlooper-theme', themeName);
        this.updateConsole(`Theme changed to ${themeName}`, 'success');
    }

    toggleTheme() {
        let newTheme;
        if (this.currentTheme === 'dark') {
            newTheme = 'light';
        } else if (this.currentTheme === 'light') {
            newTheme = 'retro';
        } else if (this.currentTheme === 'retro') {
            newTheme = 'dark';
        } else {
            newTheme = 'dark';
        }
        this.changeTheme(newTheme);
    }

    loadTheme() {
        let savedTheme = localStorage.getItem('ashlooper-theme') || 'dark';
        const isValidTheme = this.themes.some(t => t.name === savedTheme);
        if (!isValidTheme) {
            savedTheme = 'dark';
        }
        this.applyTheme(savedTheme);
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
            if (typeof ksu === 'undefined' || typeof ksu.exec !== 'function') {
                reject(new Error('AshReXcue API (ksu.exec) is not available.'));
                return;
            }

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
                .filter(file => file.trim() && file.includes('AshReXcue'))
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
            this.parseBootSessions();
            
            if (this.bootSessions.length > 1) {
                this.showSessionSelector();
            } else {
                this.currentSessionIndex = 0;
                this.displayLogContent(this.getCurrentSessionLines());
            }
            
            this.updateConsole(`Loaded ${this.originalLines.length} lines, ${this.bootSessions.length} boot sessions`);
        } catch (error) {
            this.updateConsole(`Error reading file: ${error.message}`, 'error');
            this.originalLines = [`Error reading file: ${error.message}`];
            this.displayLogContent(this.originalLines);
        } finally {
            this.showLoadingSpinner(false);
        }
    }

    parseBootSessions() {
        this.bootSessions = [];
        let currentSession = [];
        let inSession = false;

        this.originalLines.forEach((line, index) => {
            if (line.includes('◆◆◆◆◆◆◆ NEW BOOT ◆◆◆◆◆◆◆◆')) {
                if (inSession && currentSession.length > 0) {
                    this.bootSessions.push([...currentSession]);
                }
                currentSession = [line];
                inSession = true;
            } else if (line.includes('######## THE END ##########')) {
                if (inSession) {
                    currentSession.push(line);
                    this.bootSessions.push([...currentSession]);
                    currentSession = [];
                    inSession = false;
                }
            } else if (inSession) {
                currentSession.push(line);
            }
        });

        if (currentSession.length > 0) {
            this.bootSessions.push(currentSession);
        }

        if (this.bootSessions.length === 0 && this.originalLines.length > 0) {
            this.bootSessions.push([...this.originalLines]);
        }
    }

    showSessionSelector() {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'sessions-modal';

        const header = document.createElement('div');
        header.className = 'sessions-modal-header';

        const title = document.createElement('h2');
        title.className = 'sessions-modal-title';
        title.textContent = 'Select Boot Session';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'sessions-modal-close';
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

        const sessionsContent = document.createElement('div');
        sessionsContent.className = 'sessions-content';

        const sessionsList = document.createElement('div');
        sessionsList.className = 'sessions-list';

        const allSessionsItem = document.createElement('div');
        allSessionsItem.className = 'session-item';
        allSessionsItem.innerHTML = `
            <div class="session-info">
                <div class="session-time">📁 All Sessions</div>
                <div class="session-lines">${this.originalLines.length} lines</div>
            </div>
            <div class="session-select-btn">Select</div>
        `;
        
        allSessionsItem.addEventListener('click', (e) => {
            if (e.target.classList.contains('session-select-btn')) {
                this.currentSessionIndex = -1;
                this.displayLogContent(this.getCurrentSessionLines());
                
                modalOverlay.style.animation = 'fadeOut 0.3s ease-out forwards';
                modalContent.style.animation = 'scaleOut 0.3s ease-out forwards';
                setTimeout(() => {
                    if (modalOverlay.parentNode) {
                        modalOverlay.parentNode.removeChild(modalOverlay);
                    }
                }, 300);
            }
        });
        
        sessionsList.appendChild(allSessionsItem);

        this.bootSessions.forEach((session, index) => {
            const sessionItem = document.createElement('div');
            sessionItem.className = 'session-item';
            
            const firstLine = session[0] || '';
            const parts = firstLine.split(' ');
            const date = parts[0] || 'Unknown';
            const time = parts[1] ? parts[1].replace(':', '') : 'Unknown';
            const displayTime = parts[1] || 'Unknown';
            
            let isInProgress = false;
            if (session.length > 0) {
                const lastLine = session[session.length - 1];
                if (!lastLine.includes('######## THE END ##########')) {
                    isInProgress = true;
                }
            }

            const statusIndicator = isInProgress 
                ? `<div class="session-status-logging" style="color: #FFC107; font-size: 0.65em; margin-top: 3px;">
                       👺 Unfinished - loop interrupted or still running.... 
                   </div>`
                : '';
            
            sessionItem.innerHTML = `
                <div class="session-info">
                    <div class="session-time">🔄 ${date} ${displayTime}</div>
                    <div class="session-lines">${session.length} lines</div>
                    ${statusIndicator}
                </div>
                <div class="session-select-btn">Select</div>
            `;
            
            sessionItem.addEventListener('click', (e) => {
                if (e.target.classList.contains('session-select-btn')) {
                    this.currentSessionIndex = index;
                    this.displayLogContent(this.getCurrentSessionLines());
                    
                    modalOverlay.style.animation = 'fadeOut 0.3s ease-out forwards';
                    modalContent.style.animation = 'scaleOut 0.3s ease-out forwards';
                    setTimeout(() => {
                        if (modalOverlay.parentNode) {
                            modalOverlay.parentNode.removeChild(modalOverlay);
                    }
                }, 300);
                }
            });
            
            sessionsList.appendChild(sessionItem);
        });

        sessionsContent.appendChild(sessionsList);
        modalContent.appendChild(header);
        modalContent.appendChild(sessionsContent);
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeBtn.click();
            }
        });
    }

    getCurrentSessionLines() {
        if (this.currentSessionIndex === -1) {
            return this.originalLines;
        }
        return this.bootSessions[this.currentSessionIndex] || [];
    }

    getCurrentSessionTimestamp() {
        if (this.currentSessionIndex === -1) {
            return null;
        }
        
        const session = this.bootSessions[this.currentSessionIndex];
        if (session && session.length > 0) {
            const firstLine = session[0];
            const parts = firstLine.split(' ');
            const date = parts[0] || '';
            const time = parts[1] ? parts[1].replace(':', '') : '';
            
            if (date && time) {
                return `${date.replace(/\./g, '-')}-${time}`;
            }
        }
        return null;
    }

    updateSelectedFile() {
        const fileNameElement = document.getElementById('selectedFileName');
        const searchInput = document.querySelector('.search-input');
        const saveBtn = document.querySelector('.save-btn');
        const copyBtn = document.querySelector('.copy-btn');
        const clearBtn = document.querySelector('.clear-btn');
        const sessionBtn = document.querySelector('.session-btn');

        if (this.currentLogFile) {
            fileNameElement.textContent = this.currentLogFile;
            searchInput.style.display = 'block';
            saveBtn.style.display = 'flex';
            copyBtn.style.display = 'flex';
            clearBtn.style.display = 'flex';
            sessionBtn.style.display = 'flex';
        } else {
            fileNameElement.textContent = '';
            searchInput.style.display = 'none';
            saveBtn.style.display = 'none';
            copyBtn.style.display = 'none';
            clearBtn.style.display = 'none';
            sessionBtn.style.display = 'none';
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

        filteredLines.forEach((line, index) => {
            const lineElement = document.createElement('div');
            lineElement.className = 'terminal-line';

            if (line.includes('◆◆◆◆◆◆◆ NEW BOOT ◆◆◆◆◆◆◆◆')) {
                const bootHeader = document.createElement('div');
                bootHeader.className = 'boot-header';
                bootHeader.innerHTML = '🔄 NEW BOOT SESSION STARTED';
                terminalOutput.appendChild(bootHeader);
                return;
            }

            if (line.includes('######## THE END ##########')) {
                const bootFooter = document.createElement('div');
                bootFooter.className = 'boot-footer';
                bootFooter.innerHTML = '✅ BOOT SESSION COMPLETED';
                terminalOutput.appendChild(bootFooter);
                return;
            }

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
            let destFilename;
            
            if (this.currentSessionIndex === -1) {
                destFilename = this.currentLogFile;
            } else {
                const sessionTimestamp = this.getCurrentSessionTimestamp();
                if (sessionTimestamp) {
                    destFilename = `AshReXcueSession-${sessionTimestamp}.log`;
                } else {
                    destFilename = `AshReXcueSession-${Date.now()}.log`;
                }
            }

            this.updateConsole(`Saving to Downloads as ${destFilename}...`);
            
            if (this.currentSessionIndex === -1) {
                const source = `${this.logDirectory}${this.currentLogFile}`;
                const dest = `/storage/emulated/0/Download/${destFilename}`;
                await this.ksuExec(`cp "${source}" "${dest}"`);
            } else {
                const sessionContent = this.getCurrentSessionLines().join('\n');
                const tempPath = `/data/local/tmp/${destFilename}`;
                const dest = `/storage/emulated/0/Download/${destFilename}`;
                
                const safeContent = sessionContent.replace(/'/g, "'\\''");
                await this.ksuExec(`echo '${safeContent}' > "${tempPath}"`);
                await this.ksuExec(`cp "${tempPath}" "${dest}"`);
                await this.ksuExec(`rm "${tempPath}"`);
            }
            
            this.updateConsole(`Saved to /storage/emulated/0/Download/${destFilename}`);
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
        
        const terminalOutput = document.getElementById('terminalOutput');
        terminalOutput.classList.add('clearing');

        setTimeout(() => {
            terminalOutput.innerHTML = 
                '<div class="welcome-message">' +
                '<div>AshReXcue WebUI V2.1</div>' +
                '<div>Select a log file to view contents</div>' +
                '</div>';
            terminalOutput.classList.remove('clearing');
            
            this.searchQuery = '';
            document.querySelector('.search-input').value = '';
            this.originalLines = [];
            this.currentLogFile = null;
            this.bootSessions = [];
            this.currentSessionIndex = -1;
            this.updateSelectedFile();
            this.updateConsole('Terminal cleared');
        }, 300);
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
        const currentThreshold = parseInt(this.moduleInfo.threshold) || 3;
        
        const warningDiv = document.createElement('div');
        warningDiv.className = 'settings-warning';
        warningDiv.innerHTML = `
            <div class="warning-icon">⚠️</div>
            <div class="warning-text">
                <strong>Important Settings Limits:</strong><br>
                • Timeout: Can only decrease by max 10 seconds<br>
                • Threshold: Must be between 1-5<br>
                • Stability Time: Must be between 50-120 seconds.
            </div>
        `;
        settingsContent.appendChild(warningDiv);

        const infoFields = [
            { 
                key: 'version', 
                label: 'Module Version', 
                editable: false 
            },
            { 
                key: 'timeout', 
                label: 'Timeout (seconds)', 
                editable: true,
                type: 'number',
                min: currentTimeout - 10,
                max: 300,
                step: 1,
                description: `Range: ${currentTimeout - 10} - 300 seconds`
            },
            { 
                key: 'threshold', 
                label: 'Threshold', 
                editable: true,
                type: 'number',
                min: 1,
                max: 5,
                step: 1,
                description: 'Range: 1-5 (number of boot loops before protection activates)'
            },
            { 
                key: 'stability_time', 
                label: 'Stability Time (seconds)', 
                editable: true,
                type: 'number',
                min: 50,
                max: 120,
                step: 1,
                description: 'Range: 50 - 120 seconds'
            }
        ];

        const pendingChanges = {};
        const inputElements = {};

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
                    input.type = field.type || 'text';
                    input.className = 'settings-input';
                    input.value = this.moduleInfo[field.key];
                    
                    if (field.min !== undefined) input.min = field.min;
                    if (field.max !== undefined) input.max = field.max;
                    if (field.step !== undefined) input.step = field.step;
                    
                    if (field.type === 'number') {
                        input.required = true;
                    }
                    
                    inputElements[field.key] = input;
                    
                    const errorElement = document.createElement('div');
                    errorElement.className = 'input-error';
                    errorElement.id = `${field.key}-error`;
                    
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
                    
                    inputContainer.appendChild(input);
                    inputContainer.appendChild(errorElement);
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
        saveBtn.disabled = true;

        saveBtn.addEventListener('click', () => {
            if (!saveBtn.disabled) {
                this.saveSettingsChanges(pendingChanges, currentTimeout, modalOverlay);
            }
        });

        this.updateSaveButtonState(pendingChanges, currentTimeout, saveBtn);

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
        const numValue = parseInt(value);
        
        if (isNaN(numValue)) {
            if (key !== 'timeout' && key !== 'threshold' && key !== 'stability_time') {
                return true; 
            }
            return false;
        }

        switch (key) {
            case 'timeout':
                const minTimeout = currentTimeout - 10;
                const maxTimeout = 300;
                return numValue >= minTimeout && numValue <= maxTimeout;
                
            case 'threshold':
                return numValue >= 1 && numValue <= 5;
                
            case 'stability_time':
                return numValue >= 50 && numValue <= 120;
                
            default:
                return true;
        }
    }

    getErrorMessage(key, value, currentTimeout) {
        const numValue = parseInt(value);
        
        if (isNaN(numValue)) {
            return 'Please enter a valid number';
        }

        switch (key) {
            case 'timeout':
                const minTimeout = currentTimeout - 10;
                const maxTimeout = 300;
                if (numValue < minTimeout) {
                    return `Timeout cannot be less than ${minTimeout} seconds`;
                }
                if (numValue > maxTimeout) {
                    return `Timeout cannot exceed ${maxTimeout} seconds`;
                }
                break;
                
            case 'threshold':
                if (numValue < 1) {
                    return 'Threshold cannot be less than 1';
                }
                if (numValue > 5) {
                    return 'Threshold cannot exceed 5';
                }
                break;

            case 'stability_time':
                if (numValue < 50) {
                    return 'Stability Time cannot be less than 50 seconds';
                }
                if (numValue > 120) {
                    return 'Stability Time cannot exceed 120 seconds';
                }
                break;
        }
        
        return 'Invalid value';
    }

    saveSettingsChanges(pendingChanges, currentTimeout, settingsModal) {
        const invalidChanges = Object.keys(pendingChanges).filter(key => 
            !this.validateInput(key, pendingChanges[key], currentTimeout)
        );

        if (invalidChanges.length > 0) {
            this.updateConsole('Invalid settings detected', 'error');
            return;
        }

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
            if (e.target === modalOverlay) {
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
            const fileContent = updatedLines.join('\n');
            const safeContent = fileContent.replace(/'/g, "'\\''");
            await this.ksuExec(`echo '${safeContent}' > "${tempPath}"`);

            await this.ksuExec(`cp "${tempPath}" "${this.modulePropPath}"`);
            await this.ksuExec(`rm "${tempPath}"`);

            this.moduleInfo[key] = value;
            
            this.updateConsole(`Updated ${key} to ${value}`, 'success');
        } catch (error) {
            this.updateConsole(`Failed to update ${key}: ${error.message}`, 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.ashLooperUI = new AshLooperWebUI();
});

function refreshLogs() { window.ashLooperUI.refreshLogs(); }
function saveToDownload() { window.ashLooperUI.saveToDownload(); }
function clearViewer() { window.ashLooperUI.clearViewer(); }
