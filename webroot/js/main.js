import { Utils } from './utils.js';
import { FileManager } from './files.js';
import { SettingsManager } from './settings.js';
import { AshLooperIcons } from './icons.js';

class AshLooperWebUI {
    constructor() {
        this.currentLogFile = null;
        this.logFiles = [];
        this.searchQuery = '';
        this.originalLines = [];
        this.moduleInfo = {};
        this.bootSessions = [];
        this.currentSessionIndex = -1;

        this.fileManager = new FileManager(this);
        this.settingsManager = new SettingsManager(this);

        this.init();
    }

    async init() {
        document.body.classList.add('dark-retro-mode');
        
        this.setupEventListeners();
        this.setupRefreshButton();
        this.fileManager.loadLogFiles();
        this.settingsManager.loadModuleData();
        
        const logo = document.getElementById('logoContainer');
        if(logo) logo.innerHTML = AshLooperIcons.getLogo();

        Utils.updateConsole('AshReXcue WebUI V2.2 initialized');
        Utils.updateConsole("Your friendly neighborhood root savior.");
        Utils.updateConsole('Monitoring For Loops...');
        
        await Utils.displayServerInfo();
        
        Utils.showToast("Your friendly neighborhood root savior.");
    }

    setupRefreshButton() {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.innerHTML = AshLooperIcons.getRefreshIcon() + ' Refresh';
            refreshBtn.onclick = () => this.refreshLogs();
        }
    }

    setupEventListeners() {
        const fileSelectBtn = document.getElementById('fileSelectBtn');
        const closePopup = document.querySelector('.close-popup');
        const popupOverlay = document.getElementById('filePopup');

        fileSelectBtn.addEventListener('click', () => this.togglePopup());
        closePopup.addEventListener('click', () => this.closePopup());
        popupOverlay.addEventListener('click', (e) => {
            if (e.target === popupOverlay) this.closePopup();
        });

        this.setupTerminalControls();
    }

    setupTerminalControls() {
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

        const createBtn = (icon, cls, title, action) => {
            const btn = document.createElement('button');
            btn.innerHTML = icon;
            btn.className = `control-btn ${cls}`;
            btn.title = title;
            btn.style.display = 'none';
            btn.addEventListener('click', action);
            terminalControls.appendChild(btn);
            return btn;
        };

        createBtn(AshLooperIcons.getSaveIcon(), 'save-btn', 'Save', () => this.fileManager.saveToDownload());
        createBtn(AshLooperIcons.getCopyIcon(), 'copy-btn', 'Copy', () => this.copyToClipboard());
        createBtn(AshLooperIcons.getClearIcon(), 'clear-btn', 'Clear', () => this.clearViewer());
        createBtn('📋 Sessions', 'session-btn', 'Sessions', () => this.showSessionSelector());
        
        const settingsBtn = createBtn(AshLooperIcons.getSettingsIcon(), 'settings-btn', 'Settings', () => this.settingsManager.showSettingsModal());
        settingsBtn.style.display = 'flex';
    }

    togglePopup() { document.getElementById('filePopup').classList.toggle('active'); }
    closePopup() { document.getElementById('filePopup').classList.remove('active'); }

    getCurrentSessionLines() {
        if (this.currentSessionIndex === -1) return this.originalLines;
        if (this.bootSessions[this.currentSessionIndex]) {
            return this.bootSessions[this.currentSessionIndex].lines || [];
        }
        return [];
    }
    
    getCurrentSessionTimestamp() {
        if (this.currentSessionIndex === -1) return null;
        const sessionObj = this.bootSessions[this.currentSessionIndex];
        if (!sessionObj || !sessionObj.lines || sessionObj.lines.length === 0) return null;
        
        const sessionLines = sessionObj.lines;
        let timeLine = sessionLines.find(line => line.includes('>[Executing Service.sh]<')) || sessionLines[0];
        const parts = timeLine.split(' ');
        const date = parts[0] || '';
        const time = parts[1] ? parts[1].replace(/:/g, '') : '';
        if (date && time) return `${date.replace(/\./g, '-')}-${time}`;
        return null;
    }

    updateSelectedFile() {
        const fileNameElement = document.getElementById('selectedFileName');
        const elements = document.querySelectorAll('.save-btn, .copy-btn, .clear-btn, .session-btn, .search-input');
        
        if (this.currentLogFile) {
            fileNameElement.textContent = this.currentLogFile;
            elements.forEach(el => el.style.display = (el.tagName === 'BUTTON' ? 'flex' : 'block'));
        } else {
            fileNameElement.textContent = '';
            elements.forEach(el => el.style.display = 'none');
        }
    }

    displayLogContent(lines) {
        const terminalOutput = document.getElementById('terminalOutput');
        terminalOutput.innerHTML = '';
        if (!lines || lines.length === 0) {
            terminalOutput.innerHTML = '<div class="terminal-line">[Empty file]</div>';
            return;
        }

        const filtered = this.searchQuery ? lines.filter(l => l.toLowerCase().includes(this.searchQuery)) : lines;
        
        filtered.forEach(line => {
            const el = document.createElement('div');
            el.className = 'terminal-line';
            
            if (line.includes('NEW BOOT') && line.includes('◆◆◆')) {
               const bootNum = line.match(/BOOT (\d+)/);
               el.innerHTML = `<div class="boot-header">🔄 NEW BOOT SESSION ${bootNum ? '#' + bootNum[1] : ''}</div>`;
               terminalOutput.appendChild(el);
               return;
            }
            
            if (line.includes('######## THE END ##########')) {
                const bootFooter = document.createElement('div');
                bootFooter.className = 'boot-footer';
                bootFooter.innerHTML = '✅ BOOT SESSION COMPLETED';
                terminalOutput.appendChild(bootFooter);
                return;
            }

            if (line.includes('ERROR') || line.includes('FAILED') || line.includes('fu*ked') || line.includes('CRITICAL')) el.classList.add('error');
            else if (line.includes('WARNING') || line.includes('CAUTION') || line.includes('Stability WARNING')) el.classList.add('warning');
            else if (line.includes('SUCCESS') || line.includes('COMPLETED') || line.includes('OK') || line.includes('Passed')) el.classList.add('success');
            else if (line.includes('INFO') || line.includes('STARTED') || line.includes('RUNNING') || line.includes('Executing')) el.classList.add('info');
            else if (line.includes('RTC Status: CORRECT')) el.classList.add('rct-correct');
            else if (line.includes('RTC Status: BACKWARD') || line.includes('RTC Status: INCORRECT')) el.classList.add('rct-incorrect');
            
            el.textContent = line;
            terminalOutput.appendChild(el);
        });
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
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
        closeBtn.addEventListener('click', () => Utils.removeModal(modalOverlay));

        header.appendChild(title);
        header.appendChild(closeBtn);

        const sessionsContent = document.createElement('div');
        sessionsContent.className = 'sessions-content';
        const sessionsList = document.createElement('div');
        sessionsList.className = 'sessions-list';

        const allSessionsItem = document.createElement('div');
        allSessionsItem.className = 'session-item';
        allSessionsItem.innerHTML = `
            <div class="session-boot-idx">ALL</div>
            <div class="session-main-content">
                <div class="session-info-row">
                    <div class="session-time">📂 All Log Data</div>
                </div>
                <div class="session-info-row">
                    <div class="session-lines">Lines: ${this.originalLines.length}</div>
                </div>
            </div>
            <div class="session-action">
                <button class="session-select-btn">Select</button>
            </div>
        `;
        allSessionsItem.querySelector('.session-select-btn').addEventListener('click', () => {
            this.currentSessionIndex = -1;
            this.displayLogContent(this.getCurrentSessionLines());
            Utils.removeModal(modalOverlay);
        });
        sessionsList.appendChild(allSessionsItem);

        this.bootSessions.forEach((sessionObj, index) => {
            const sessionItem = document.createElement('div');
            sessionItem.className = 'session-item';
            
            const sessionLines = sessionObj.lines;
            const meta = sessionObj.meta;

            let bootNum = meta.bootNum || "??";
            
            let statusBadge = '';
            
            if (!meta.hasEnd) {
                const isLastSession = index === this.bootSessions.length - 1;
                if (isLastSession) {
                    statusBadge = `<div class="session-badge active">⚠️ Active Session</div>`;
                } else {
                    statusBadge = `<div class="session-badge loop">🚫 Bootloop</div>`;
                }
            }

            let displayString = "Unknown Time";
            
            if (meta.rctStatus === 'Incorrect') {
                 if (meta.time && meta.time !== 'Unknown') displayString = `🕒 ${meta.time}`;
                 else displayString = "🕒 Time Unsynced";
            } else {
                 if (meta.date && meta.date !== 'Unknown') displayString = `📅 ${meta.date} 🕒 ${meta.time}`;
                 else displayString = "📅 Unknown Date";
            }
            
            sessionItem.innerHTML = `
                <div class="session-boot-idx">Boot ${bootNum}</div>
                <div class="session-main-content">
                    <div class="session-info-row">
                        <div class="session-time">${displayString}</div>
                        ${statusBadge}
                    </div>
                    <div class="session-info-row">
                        <div class="session-lines">Lines: ${sessionLines.length}</div>
                        <div class="session-lines">RCT: ${meta.rctStatus}</div>
                    </div>
                </div>
                <div class="session-action">
                    <button class="session-select-btn">Select</button>
                </div>
            `;
            
            sessionItem.querySelector('.session-select-btn').addEventListener('click', () => {
                this.currentSessionIndex = index;
                this.displayLogContent(this.getCurrentSessionLines());
                Utils.removeModal(modalOverlay);
            });
            sessionsList.appendChild(sessionItem);
        });

        sessionsContent.appendChild(sessionsList);
        modalContent.appendChild(header);
        modalContent.appendChild(sessionsContent);
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) Utils.removeModal(modalOverlay);
        });
    }

    refreshLogs() { this.fileManager.loadLogFiles(); }
    copyToClipboard() { Utils.copyToClipboard(this.getCurrentSessionLines().join('\n')); }
    clearViewer() {
        const terminalOutput = document.getElementById('terminalOutput');
        terminalOutput.classList.add('clearing');
        setTimeout(() => {
            terminalOutput.innerHTML = '<div class="welcome-message"><div>AshReXcue WebUI V2.2</div><div>Cleared</div></div>';
            terminalOutput.classList.remove('clearing');
            this.searchQuery = '';
            document.querySelector('.search-input').value = '';
            this.originalLines = [];
            this.currentLogFile = null;
            this.bootSessions = [];
            this.currentSessionIndex = -1;
            this.updateSelectedFile();
        }, 300);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.ashLooperUI = new AshLooperWebUI();
});