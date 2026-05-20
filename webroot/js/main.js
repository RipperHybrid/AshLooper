import { Utils } from './utils.js';
import { FileManager } from './files.js';
import { SettingsManager } from './settings.js';
import { WhitelistManager } from './whitelist.js';
import { AshLooperIcons } from './icons.js';

export const Config = {
    logDirectory: '/cache/looper/',
    moduleDir: '/data/adb/modules/AshLooper',
    modulePropPath: '/data/adb/modules/AshLooper/module.prop',
    settingsPropPath: '/data/adb/modules/AshLooper/settings.prop',
};

class AshReXcueWebUI {
    constructor() {
        this.currentLogFile = null;
        this.logFiles = [];
        this.searchQuery = '';
        this.originalLines = [];
        this.moduleInfo = {};
        this.bootSessions = [];
        this.currentSessionIndex = -1;
        this.settingsLoaded = false;
        this.whitelistLoaded = false;
        this.activeTab = 'logs';
        this.forceSettingsEdit = false;

        this.tabsConfig = [
            { id: 'logs',      label: 'Logs',      iconMethod: 'getFabLogsIcon' },
            { id: 'whitelist', label: 'Whitelist', iconMethod: 'getFabWhitelistIcon' },
            { id: 'settings',  label: 'Settings',  iconMethod: 'getFabSettingsIcon' }
        ];

        this.fileManager = new FileManager(this);
        this.settingsManager = new SettingsManager(this);
        this.whitelistManager = new WhitelistManager(this);
        this.init();
    }

    async init() {
        AshLooperIcons.renderAll();
        this.renderNav();
        this.setupEventListeners();
        this.setupRefreshButton();
        this.fileManager.loadLogFiles();
        await this.settingsManager.loadModuleData();
        this.loadBanner();

        Utils.updateConsole('AshReXcue WebUI V2.6 initialized');
        Utils.updateConsole('Your friendly neighborhood root savior.');
        Utils.updateConsole('Monitoring For Loops...');
    }

    async loadBanner() {
        try {
            const rawB64 = await Utils.ksuExec(`base64 "/data/adb/modules/AshLooper/banner" 2>/dev/null`);
            if (rawB64) {
                const cleanB64 = rawB64.replace(/\s+/g, '');
                if (cleanB64.length > 100) {
                    const bannerContainer = document.getElementById('logs-banner-container');
                    if (bannerContainer) {
                        bannerContainer.innerHTML = `<img src="data:image/png;base64,${cleanB64}" class="logs-banner">`;
                        bannerContainer.style.display = 'block';
                    }
                }
            }
        } catch (err) {}
    }

    renderNav() {
        const nav = document.getElementById('bottom-nav');
        if (!nav) return;
        nav.innerHTML = this.tabsConfig.map(p => `
            <button class="nav-item ${this.activeTab === p.id ? 'active' : ''}" data-tab="${p.id}">
                ${AshLooperIcons[p.iconMethod]()}
                <span>${p.label}</span>
            </button>
        `).join('');
        nav.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', e => {
                const tabId = e.currentTarget.dataset.tab;
                if (this.activeTab !== tabId) this.switchTab(tabId);
            });
        });
    }

    async switchTab(tabId) {
        if (this.activeTab === 'settings' && this.settingsLoaded) {
            if (Object.keys(this.settingsManager.pendingChanges).length > 0) {
                this.settingsManager._discard();
            }
        } else if (this.activeTab === 'whitelist' && this.whitelistLoaded) {
            if (this.whitelistManager.selectedModules.size > 0) {
                this.whitelistManager._discard();
            }
        }

        if ((tabId === 'settings' || tabId === 'whitelist') && !this.forceSettingsEdit) {
            Utils.showLoadingSpinner(true);
            await this.settingsManager.loadModuleData();
            Utils.showLoadingSpinner(false);

            if (this.moduleInfo.boot === 'booting') {
                this.showBootingWarning(tabId);
                return;
            }
        }

        this.executeTabSwitch(tabId);
    }

    executeTabSwitch(tabId) {
        this.activeTab = tabId;
        this.renderNav();
        document.body.className = `theme-${tabId}`;
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const activeTabEl = document.getElementById(`${tabId}Tab`);
        if (activeTabEl) activeTabEl.classList.add('active');

        if (tabId === 'settings') {
            if (!this.settingsLoaded) {
                this.settingsManager.loadSettingsTab();
                this.settingsLoaded = true;
            } else {
                this.settingsManager.updateUI();
            }
        } else if (tabId === 'whitelist') {
            if (!this.whitelistLoaded) {
                this.whitelistManager.init();
                this.whitelistManager.loadModules();
                this.whitelistLoaded = true;
            } else {
                this.whitelistManager.loadModules();
            }
        }

        this.forceSettingsEdit = false;
    }

    showBootingWarning(targetTab) {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'popup-overlay active';
        modalOverlay.style.zIndex = '9999';

        const modalContent = document.createElement('div');
        modalContent.className = 'popup';
        modalContent.style.maxWidth = '360px';

        const header = document.createElement('div');
        header.className = 'popup-header';
        header.innerHTML = `<h3 style="color: var(--red); display: flex; align-items: center; gap: 8px;">${AshLooperIcons.getWarningIcon()} Service Active</h3>`;

        const content = document.createElement('div');
        content.className = 'popup-content';
        content.innerHTML = `
            <p style="margin-bottom: 10px; color: var(--text-2); font-size: 13px; text-align: center;">
                The background monitoring script is still running. Changing settings right now can interfere with <b>service.sh</b> and cause unexpected behavior.
            </p>
            <p style="margin-bottom: 20px; color: var(--yellow); font-size: 12px; font-weight: bold; text-align: center;">
                Are you sure you want to force edit?
            </p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="btnCancelForce" class="refresh-btn" style="flex: 1; border-radius: var(--r-pill);">Cancel</button>
                <button id="btnForceEdit" class="refresh-btn" style="flex: 1; border-radius: var(--r-pill); background: var(--red); color: white; border-color: var(--red); font-weight: bold;">Force Edit</button>
            </div>
        `;

        modalContent.appendChild(header);
        modalContent.appendChild(content);
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        document.getElementById('btnCancelForce').onclick = () => {
            modalOverlay.classList.remove('active');
            setTimeout(() => modalOverlay.remove(), 300);
        };

        document.getElementById('btnForceEdit').onclick = () => {
            modalOverlay.classList.remove('active');
            setTimeout(() => modalOverlay.remove(), 300);
            this.forceSettingsEdit = true;
            this.executeTabSwitch(targetTab);
        };
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

        if(fileSelectBtn) fileSelectBtn.addEventListener('click', () => this.togglePopup());
        if(closePopup) closePopup.addEventListener('click', () => this.closePopup());
        if(popupOverlay) {
            popupOverlay.addEventListener('click', (e) => {
                if (e.target === popupOverlay) this.closePopup();
            });
        }

        this.setupTerminalControls();

        const blurInput = (e) => {
            if (document.activeElement && document.activeElement.tagName === 'INPUT' && e.target !== document.activeElement) {
                if (e.target.closest('.terminal-controls')) return;
                document.activeElement.blur();
            }
        };

        document.addEventListener('touchstart', blurInput, { passive: true });
        document.addEventListener('mousedown', blurInput, { passive: true });
    }

    setupTerminalControls() {
        const terminalControls = document.querySelector('.terminal-controls');
        if(!terminalControls) return;

        terminalControls.style.display = 'flex';
        terminalControls.style.flexWrap = 'wrap';
        terminalControls.style.gap = '8px';
        terminalControls.style.alignItems = 'center';
        terminalControls.style.justifyContent = 'space-between';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Filter logs...';
        searchInput.className = 'search-input';
        searchInput.style.display = 'none';
        searchInput.style.flex = '1 1 120px';
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            if (this.currentLogFile) this.displayLogContent(this.getCurrentSessionLines());
        });
        terminalControls.insertBefore(searchInput, terminalControls.firstChild);

        const btnGroup = document.createElement('div');
        btnGroup.className = 'terminal-btn-group';
        btnGroup.style.display = 'none';
        btnGroup.style.gap = '6px';
        btnGroup.style.flexWrap = 'nowrap';
        btnGroup.style.alignItems = 'center';
        btnGroup.style.overflowX = 'auto';

        const createBtn = (icon, cls, title, action) => {
            const btn = document.createElement('button');
            btn.innerHTML = icon;
            btn.className = `control-btn ${cls}`;
            btn.title = title;
            btn.style.display = 'flex';
            btn.addEventListener('click', action);
            btnGroup.appendChild(btn);
            return btn;
        };

        createBtn(AshLooperIcons.getSaveIcon(),  'ctrl-save',    'Save',     () => this.fileManager.saveToDownload());
        createBtn(AshLooperIcons.getCopyIcon(),  'ctrl-copy',    'Copy',     () => this.copyToClipboard());
        createBtn(AshLooperIcons.getClearIcon(), 'ctrl-clear',   'Clear',    () => this.clearViewer());
        createBtn(AshLooperIcons.getLayerGroupIcon(), 'ctrl-session', 'Sessions', () => this.showSessionSelector());
        createBtn(AshLooperIcons.getRefreshIcon(), 'ctrl-refresh', 'Refresh', () => this.fileManager.refreshCurrentFile());

        terminalControls.appendChild(btnGroup);
    }

    clearSearch() {
        this.searchQuery = '';
        const searchInput = document.querySelector('.search-input');
        if (searchInput) searchInput.value = '';
    }

    togglePopup() { document.getElementById('filePopup').classList.toggle('active'); }
    closePopup()  { document.getElementById('filePopup').classList.remove('active'); }

    getCurrentSessionLines() {
        if (this.currentSessionIndex === -1) return this.originalLines;
        return this.bootSessions[this.currentSessionIndex]?.lines || [];
    }

    updateSelectedFile() {
        const fileNameEl = document.getElementById('selectedFileName');
        const searchInput = document.querySelector('.search-input');
        const btnGroup = document.querySelector('.terminal-btn-group');

        if (this.currentLogFile) {
            let statusHtml = '';
            if (this.currentSessionIndex !== -1) {
                const meta = this.bootSessions[this.currentSessionIndex]?.meta;
                if (meta && !meta.hasEnd) {
                    statusHtml = ' <span style="color: var(--yellow); font-size: 10px; font-weight: normal; margin-left: 5px;">(Incomplete/Running)</span>';
                }
            } else if (this.bootSessions.length > 0) {
                const lastSession = this.bootSessions[this.bootSessions.length - 1];
                if (lastSession && !lastSession.meta.hasEnd) {
                    statusHtml = ' <span style="color: var(--yellow); font-size: 10px; font-weight: normal; margin-left: 5px;">(Latest: Running)</span>';
                }
            }
            if (fileNameEl) fileNameEl.innerHTML = `${this.currentLogFile}${statusHtml}`;
            if (searchInput) searchInput.style.display = 'block';
            if (btnGroup) btnGroup.style.display = 'flex';
        } else {
            if (fileNameEl) fileNameEl.textContent = '';
            if (searchInput) searchInput.style.display = 'none';
            if (btnGroup) btnGroup.style.display = 'none';
        }
    }

    displayLogContent(lines) {
        const terminalOutput = document.getElementById('terminalOutput');
        terminalOutput.innerHTML = '';

        if (!lines || lines.length === 0) {
            terminalOutput.innerHTML = '<div class="terminal-line">[Empty file]</div>';
            return;
        }

        const filtered = this.searchQuery
            ? lines.filter(l => l.toLowerCase().includes(this.searchQuery))
            : lines;

        filtered.forEach(line => {
            if (line.includes('NEW BOOT') && line.includes('◆◆◆')) {
                const bootNum = line.match(/BOOT (\d+)/);
                const el = document.createElement('div');
                el.className = 'boot-header';
                el.innerHTML = `🔄 NEW BOOT SESSION ${bootNum ? '#' + bootNum[1] : ''}`;
                terminalOutput.appendChild(el);
                return;
            }
            if (line.includes('######## THE END ##########')) {
                const el = document.createElement('div');
                el.className = 'boot-footer';
                el.innerHTML = '✅ BOOT SESSION COMPLETED';
                terminalOutput.appendChild(el);
                return;
            }
            const el = document.createElement('div');
            el.className = 'terminal-line';

            if (line.includes('Error ') || line.includes('fu*ked') || line.includes('Disabled module') || line.includes('Disabling ALL') || line.includes('Lockdown Mode') || line.includes('Crash detected')) {
                el.classList.add('error');
            } else if (line.includes('Warning ') || line.includes('Threshold reached') || line.includes('disabling new modules') || line.includes('activating lockdown') || line.includes('Duplicate instance') || line.includes('Skipping whitelisted')) {
                el.classList.add('warning');
            }

            el.textContent = line;
            terminalOutput.appendChild(el);
        });

        if (!this.searchQuery) {
            terminalOutput.scrollTop = terminalOutput.scrollHeight;
        }
    }

    showSessionSelector(onSelect, onCancel) {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'popup-overlay active';
        const modalContent = document.createElement('div');
        modalContent.className = 'popup';
        const header = document.createElement('div');
        header.className = 'popup-header';
        const title = document.createElement('h3');
        title.textContent = 'Select Boot Session';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-popup';
        closeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

        closeBtn.addEventListener('click', () => {
            modalOverlay.classList.remove('active');
            setTimeout(() => modalOverlay.remove(), 200);
            if (onCancel) onCancel();
        });

        header.appendChild(title);
        header.appendChild(closeBtn);

        const sessionsContent = document.createElement('div');
        sessionsContent.className = 'popup-content';
        const sessionsList = document.createElement('div');
        sessionsList.className = 'file-list';
        const allItem = document.createElement('div');
        allItem.className = 'file-item';
        allItem.innerHTML = `
            <div class="file-name-display">ALL DATA</div>
            <div class="file-path">Total Lines: ${this.originalLines.length}</div>
        `;

        allItem.addEventListener('click', () => {
            this.currentSessionIndex = -1;
            modalOverlay.classList.remove('active');
            setTimeout(() => modalOverlay.remove(), 200);
            this.clearSearch();
            if (onSelect) onSelect();
            else { this.updateSelectedFile(); this.displayLogContent(this.getCurrentSessionLines()); }
        });
        sessionsList.appendChild(allItem);

        this.bootSessions.forEach((sessionObj, index) => {
            const meta = sessionObj.meta;
            const bootNum = meta.bootNum || '??';
            let displayString = 'Unknown Time';
            if (meta.rctStatus === 'Incorrect') {
                displayString = meta.time && meta.time !== 'Unknown' ? `${meta.time}` : 'Time Unsynced';
            } else {
                displayString = meta.date && meta.date !== 'Unknown' ? `${meta.date} ${meta.time}` : 'Unknown Date';
            }

            const isClean = meta.hasEnd;
            const badge = isClean ? '' : '<span style="color: var(--yellow); font-size: 10px; margin-left: 6px; padding: 2px 6px; background: rgba(251,191,36,0.1); border-radius: 4px; border: 1px solid rgba(251,191,36,0.2);">Incomplete/Running</span>';

            const sessionItem = document.createElement('div');
            sessionItem.className = 'file-item';
            sessionItem.innerHTML = `
                <div class="file-name-display">Boot ${bootNum} ${badge}</div>
                <div class="file-path">${displayString} | Lines: ${sessionObj.lines.length}</div>
            `;
            sessionItem.addEventListener('click', () => {
                this.currentSessionIndex = index;
                modalOverlay.classList.remove('active');
                setTimeout(() => modalOverlay.remove(), 200);
                this.clearSearch();
                if (onSelect) onSelect();
                else { this.updateSelectedFile(); this.displayLogContent(this.getCurrentSessionLines()); }
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
                modalOverlay.classList.remove('active');
                setTimeout(() => modalOverlay.remove(), 200);
                if (onCancel) onCancel();
            }
        });
    }

    refreshLogs() { this.fileManager.loadLogFiles(); }

    copyToClipboard() {
        const terminalOutput = document.getElementById('terminalOutput');
        if (!terminalOutput) return;
        const visibleLines = Array.from(terminalOutput.querySelectorAll('.terminal-line'))
            .map(el => el.textContent.trim())
            .filter(t => t.length > 0)
            .join('\n');
        if (visibleLines) Utils.copyToClipboard(visibleLines);
        else Utils.showToast('Nothing to copy', 'warning');
    }

    clearViewer() {
        const terminalOutput = document.getElementById('terminalOutput');
        terminalOutput.classList.add('clearing');
        setTimeout(() => {
            terminalOutput.innerHTML = '<div class="empty-state"><div style="width: 40px; height: 40px; opacity: 0.5;"><i data-icon="fabLogs"></i></div><h3>AshReXcue V2.6</h3><p>Cleared</p></div>';
            terminalOutput.classList.remove('clearing');
            this.clearSearch();
            this.originalLines = [];
            this.currentLogFile = null;
            this.bootSessions = [];
            this.currentSessionIndex = -1;
            this.updateSelectedFile();
        }, 300);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.ashLooperUI = new AshReXcueWebUI();
});