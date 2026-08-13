import { Utils, ChangesPill } from './utils.js';
import { FileManager } from './files.js';
import { SettingsManager } from './settings.js';
import { WhitelistManager } from './whitelist.js';
import { ItemsManager } from './items.js';
import { AshLooperIcons } from './icons.js';

export const Config = {
    logDirectory: '/cache/looper/',
    moduleDir: '/data/adb/modules/AshLooper',
    modulePropPath: '/data/adb/modules/AshLooper/module.prop',
    settingsPropPath: '/data/adb/modules/AshLooper/settings.prop',
    ashLooperDir: '/data/adb/ashlooper',
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
        this.itemsLoaded = false;
        this.activeTab = 'logs';
        this.forceSettingsEdit = false;
        this.isSwitchingTab = false;
        this.currentJsonRaw = '';

        this.tabsConfig = [
            { id: 'logs',      label: 'Logs',      iconMethod: 'getFabLogsIcon' },
            { id: 'whitelist', label: 'Whitelist', iconMethod: 'getFabWhitelistIcon' },
            { id: 'items',     label: 'Items',     iconMethod: 'getLayerGroupIcon' },
            { id: 'settings',  label: 'Settings',  iconMethod: 'getFabSettingsIcon' }
        ];

        this.pill = new ChangesPill();
        this.fileManager = new FileManager(this);
        this.settingsManager = new SettingsManager(this);
        this.whitelistManager = new WhitelistManager(this);
        this.itemsManager = new ItemsManager(this);
        this.init();
    }

    async init() {
        AshLooperIcons.renderAll();
        this.renderNav();
        this.setupEventListeners();
        this.setupRefreshButton();
        this.fileManager.loadLogFiles();
        await this.settingsManager.loadModuleData();

        const env = (typeof ksu !== 'undefined' && typeof ksu.exec === 'function') ? 'KSU WebUI' : 'Localhost';

        Utils.updateConsole('AshReXcue WebUI V2.6 initialized');
        Utils.updateConsole(`Connection: ${env}`);
        Utils.updateConsole('Monitoring For Loops...');
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
                if (this.isSwitchingTab) return;
                const tabId = e.currentTarget.dataset.tab;
                if (this.activeTab !== tabId) this.switchTab(tabId);
            });
        });
    }

    async refreshBootState() {
        try {
            const raw = await Utils.ksuExec(`grep '^boot=' "${Config.settingsPropPath}" 2>/dev/null | cut -d'=' -f2-`);
            const val = raw.trim();
            if (val) this.moduleInfo.boot = val;
        } catch (error) {}
    }

    async switchTab(tabId) {
        if (this.isSwitchingTab) return;

        if (tabId === 'settings' || tabId === 'whitelist' || tabId === 'items') {
            await this.refreshBootState();
        }

        if (this.moduleInfo.boot === 'booting' && (tabId === 'settings' || tabId === 'whitelist' || tabId === 'items') && !this.forceSettingsEdit) {
            this.showBootingWarning(tabId);
            return;
        }

        this.executeTabSwitch(tabId);
        this.isSwitchingTab = true;

        setTimeout(async () => {
            try {
                if (tabId === 'settings') {
                    if (!this.settingsLoaded) {
                        await this.settingsManager.loadSettingsTab();
                        this.settingsLoaded = true;
                    } else {
                        this.settingsManager.updateUI();
                    }
                } else if (tabId === 'whitelist') {
                    if (!this.whitelistLoaded) {
                        this.whitelistManager.init();
                        await this.whitelistManager.loadModules(true);
                        this.whitelistLoaded = true;
                    } else {
                        this.whitelistManager.updateUI();
                    }
                } else if (tabId === 'items') {
                    if (!this.itemsLoaded) {
                        this.itemsManager.init();
                        await this.itemsManager.loadItems(true);
                        this.itemsManager.bindEvents();
                        this.itemsLoaded = true;
                    } else {
                        this.itemsManager.updateUI();
                    }
                }
            } finally {
                this.forceSettingsEdit = false;
                this.isSwitchingTab = false;
            }
        }, 50);
    }

    executeTabSwitch(tabId) {
        this.activeTab = tabId;
        this.renderNav();
        document.body.className = `theme-${tabId}`;

        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const activeTabEl = document.getElementById(`${tabId}Tab`);
        if (activeTabEl) activeTabEl.classList.add('active');
    }

    updateGlobalPill() {
        const sm = this.settingsManager;
        const wm = this.whitelistManager;
        const im = this.itemsManager;

        const settingsCount = sm.pendingChanges ? Object.keys(sm.pendingChanges).length : 0;
        const whitelistCount = wm.pendingChanges ? wm.pendingChanges.size : 0;
        const itemsCount = im.pendingChanges ? im.pendingChanges.size : 0;

        const total = settingsCount + whitelistCount + itemsCount;

        let mode = 'default';
        let hasAdd = false;
        let hasRemove = false;

        if (im.pendingChanges) {
            for (let val of im.pendingChanges.values()) {
                if (val) hasAdd = true;
                else hasRemove = true;
            }
        }
        if (wm.pendingChanges) {
            for (let val of wm.pendingChanges.values()) {
                if (val) hasAdd = true;
                else hasRemove = true;
            }
        }
        if (settingsCount > 0) {
            const smTypes = sm.getChangeTypes();
            if (smTypes.hasAdd) hasAdd = true;
            if (smTypes.hasRemove) hasRemove = true;
        }

        if (hasAdd && hasRemove) mode = 'mixed';
        else if (hasRemove && !hasAdd) mode = 'remove';

        if (total > 0) {
            this.pill.update(total, {
                onSave: async () => {
                    this.pill.setSaving(true);
                    Utils.showLoadingSpinner(true);

                    if (settingsCount > 0) await sm._save(true);
                    if (whitelistCount > 0) await wm.applyChanges(true);
                    if (itemsCount > 0) await im.applyChanges(true);

                    this.pill.setSaving(false);
                    this.pill.hide();
                    Utils.showLoadingSpinner(false);
                    Utils.showToast('All changes saved', 'success');
                },
                onDiscard: () => {
                    if (settingsCount > 0) sm._discard(true);
                    if (whitelistCount > 0) wm._discard(true);
                    if (itemsCount > 0) im._discard(true);

                    this.pill.hide();
                    Utils.showToast('All changes discarded', 'info');
                },
                mode: mode
            });
        } else {
            this.pill.hide();
        }
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

        document.body.classList.add('popup-open');

        document.getElementById('btnCancelForce').onclick = () => {
            modalOverlay.classList.remove('active');
            setTimeout(() => modalOverlay.remove(), 300);
            document.body.classList.remove('popup-open');
        };

        document.getElementById('btnForceEdit').onclick = () => {
            modalOverlay.classList.remove('active');
            setTimeout(() => modalOverlay.remove(), 300);
            document.body.classList.remove('popup-open');
            this.forceSettingsEdit = true;
            this.switchTab(targetTab);
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
        const closeFilePopupBtn = document.getElementById('closeFilePopup');
        const popupOverlay = document.getElementById('filePopup');

        if(fileSelectBtn) fileSelectBtn.addEventListener('click', () => this.togglePopup());
        if(closeFilePopupBtn) closeFilePopupBtn.addEventListener('click', () => this.closePopup());
        if(popupOverlay) {
            popupOverlay.addEventListener('click', (e) => {
                if (e.target === popupOverlay) this.closePopup();
            });
        }

        const appHeaderBtn = document.getElementById('appHeaderBtn');
        const moduleInfoPopup = document.getElementById('moduleInfoPopup');
        const closeModuleInfoPopup = document.getElementById('closeModuleInfoPopup');

        if (appHeaderBtn) {
            appHeaderBtn.style.cursor = 'pointer';
            appHeaderBtn.addEventListener('click', (e) => {
                if (e.target.closest('#globalHelpBtn') || e.target.closest('#jsonViewerBtn')) return;
                this.openModuleInfoPopup();
            });
        }
        if (closeModuleInfoPopup) {
            closeModuleInfoPopup.addEventListener('click', () => {
                if (moduleInfoPopup) moduleInfoPopup.classList.remove('active');
                document.body.classList.remove('popup-open');
            });
        }
        if (moduleInfoPopup) {
            moduleInfoPopup.addEventListener('click', (e) => {
                if (e.target === moduleInfoPopup) {
                    moduleInfoPopup.classList.remove('active');
                    document.body.classList.remove('popup-open');
                }
            });
        }

        const globalHelpBtn = document.getElementById('globalHelpBtn');
        const globalHelpPopup = document.getElementById('globalHelpPopup');
        const closeGlobalHelpPopup = document.getElementById('closeGlobalHelpPopup');

        if (globalHelpBtn) {
            globalHelpBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (globalHelpPopup) {
                    globalHelpPopup.classList.add('active');
                    document.body.classList.add('popup-open');
                }
            });
        }
        if (closeGlobalHelpPopup) {
            closeGlobalHelpPopup.addEventListener('click', () => {
                if (globalHelpPopup) globalHelpPopup.classList.remove('active');
                document.body.classList.remove('popup-open');
            });
        }
        if (globalHelpPopup) {
            globalHelpPopup.addEventListener('click', (e) => {
                if (e.target === globalHelpPopup) {
                    globalHelpPopup.classList.remove('active');
                    document.body.classList.remove('popup-open');
                }
            });
        }

        const jsonViewerBtn = document.getElementById('jsonViewerBtn');
        const jsonViewerPopup = document.getElementById('jsonViewerPopup');
        const closeJsonViewer = document.getElementById('closeJsonViewer');
        const jsonCopyBtn = document.getElementById('jsonCopyBtn');

        if (jsonViewerBtn) {
            jsonViewerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openJsonViewer();
            });
        }
        if (closeJsonViewer) {
            closeJsonViewer.addEventListener('click', () => {
                if (jsonViewerPopup) jsonViewerPopup.classList.remove('active');
                document.body.classList.remove('popup-open');
            });
        }
        if (jsonViewerPopup) {
            jsonViewerPopup.addEventListener('click', (e) => {
                if (e.target === jsonViewerPopup) {
                    jsonViewerPopup.classList.remove('active');
                    document.body.classList.remove('popup-open');
                }
            });
        }
        if (jsonCopyBtn) {
            jsonCopyBtn.addEventListener('click', () => {
                if (this.currentJsonRaw) {
                    Utils.copyToClipboard(this.currentJsonRaw);
                } else {
                    Utils.showToast('Nothing to copy', 'warning');
                }
            });
        }

        const activityLogBtn = document.getElementById('activityLogBtn');
        const activityLogPopup = document.getElementById('activityLogPopup');
        const closeActivityLog = document.getElementById('closeActivityLog');
        const activityCopyBtn = document.getElementById('activityCopyBtn');
        const activityClearBtn = document.getElementById('activityClearBtn');

        if (activityLogBtn) activityLogBtn.addEventListener('click', () => this.openActivityLog());
        if (closeActivityLog) closeActivityLog.addEventListener('click', () => this.closeActivityLogPopup());
        if (activityLogPopup) {
            activityLogPopup.addEventListener('click', (e) => {
                if (e.target === activityLogPopup) this.closeActivityLogPopup();
            });
        }
        if (activityCopyBtn) activityCopyBtn.addEventListener('click', () => this.copyActivityLog());
        if (activityClearBtn) activityClearBtn.addEventListener('click', () => this.clearActivityLog());

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

    async openModuleInfoPopup() {
        const moduleInfoPopup = document.getElementById('moduleInfoPopup');
        document.body.classList.add('popup-open');
        this.settingsManager.updateModuleInfoPopup();
        if (moduleInfoPopup) moduleInfoPopup.classList.add('active');
        await this.settingsManager.loadModuleData();
        this.settingsManager.updateModuleInfoPopup();
    }

    async openJsonViewer() {
        document.body.classList.add('popup-open');
        const popup = document.getElementById('jsonViewerPopup');
        if (popup) popup.classList.add('active');
        await this.loadJsonContent();
    }

    async loadJsonContent() {
        const contentEl = document.getElementById('jsonViewerContent');
        if (contentEl) contentEl.textContent = 'Loading...';
        const path = `${Config.ashLooperDir}/module.json`;
        try {
            const raw = await Utils.ksuExec(`cat "${path}" 2>/dev/null`);
            if (!raw || !raw.trim()) {
                if (contentEl) contentEl.textContent = 'File not found or empty.';
                this.currentJsonRaw = '';
                return;
            }
            if (contentEl) contentEl.textContent = raw;
            this.currentJsonRaw = raw;
        } catch (error) {
            if (contentEl) contentEl.textContent = 'File not found.';
            this.currentJsonRaw = '';
        }
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.innerText = str ?? '';
        return div.innerHTML;
    }

    async openActivityLog() {
        document.body.classList.add('popup-open');
        const popup = document.getElementById('activityLogPopup');
        if (popup) popup.classList.add('active');
        this.renderActivityLog();
    }

    closeActivityLogPopup() {
        const popup = document.getElementById('activityLogPopup');
        if (popup) popup.classList.remove('active');
        document.body.classList.remove('popup-open');
    }

    renderActivityLog() {
        const content = document.getElementById('activityLogContent');
        if (!content) return;
        const history = Utils.commandHistory;
        if (history.length === 0) {
            content.innerHTML = `<div class="debug-empty">No commands executed yet.</div>`;
            return;
        }
        content.innerHTML = history.slice().reverse().map((entry, idx) => `
            <div class="debug-entry">
                <div class="debug-entry-head"><span>#${history.length - idx}</span><span>${this.escapeHtml(entry.time)}</span></div>
                <div class="debug-cmd">${this.escapeHtml(entry.command)}</div>
                <div class="${entry.error ? 'debug-err' : 'debug-out'}">${this.escapeHtml(entry.error || entry.output || '(empty)')}</div>
            </div>
        `).join('');
    }

    copyActivityLog() {
        if (Utils.commandHistory.length === 0) {
            Utils.showToast('Nothing to copy', 'warning');
            return;
        }
        const text = Utils.commandHistory.map((entry, idx) =>
            `[${idx + 1}] ${entry.time}\nCMD: ${entry.command}\n${entry.error ? `ERR: ${entry.error}` : `OUT: ${entry.output}`}\n`
        ).join('\n-------------------\n');
        Utils.copyToClipboard(text);
    }

    async clearActivityLog() {
        Utils.commandHistory = [];
        this.renderActivityLog();
        Utils.showToast('Activity log cleared', 'info');
    }

    setupTerminalControls() {
        const terminalControls = document.querySelector('.terminal-controls');
        if(!terminalControls) return;

        terminalControls.style.display = 'flex';
        terminalControls.style.flexWrap = 'wrap';
        terminalControls.style.gap = '8px';
        terminalControls.style.alignItems = 'center';

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

    togglePopup() {
        const popup = document.getElementById('filePopup');
        popup.classList.toggle('active');
        if (popup.classList.contains('active')) {
            document.body.classList.add('popup-open');
        } else {
            document.body.classList.remove('popup-open');
        }
    }
    closePopup() {
        document.getElementById('filePopup').classList.remove('active');
        document.body.classList.remove('popup-open');
    }

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

        const frag = document.createDocumentFragment();

        filtered.forEach(line => {
            if (line.includes('NEW BOOT') && line.includes('◆◆◆')) {
                const bootNum = line.match(/BOOT (\d+)/);
                const el = document.createElement('div');
                el.className = 'boot-header';
                el.innerHTML = `🔄 NEW BOOT SESSION ${bootNum ? '#' + bootNum[1] : ''}`;
                frag.appendChild(el);
                return;
            }
            if (line.includes('######## THE END ##########')) {
                const el = document.createElement('div');
                el.className = 'boot-footer';
                el.innerHTML = '✅ BOOT SESSION COMPLETED';
                frag.appendChild(el);
                return;
            }
            const el = document.createElement('div');
            el.className = 'terminal-line';

            if (line.includes('Error ') || line.includes('fu*ked') || line.includes('Disabled module') || line.includes('Disabling ALL') || line.includes('Lockdown Mode') || line.includes('Crash detected') || line.includes('NUKING') || line.includes('Nuked')) {
                el.classList.add('error');
            } else if (line.includes('Warning ') || line.includes('Threshold reached') || line.includes('disabling new modules') || line.includes('activating lockdown') || line.includes('Duplicate instance') || line.includes('Skipping whitelisted')) {
                el.classList.add('warning');
            }

            el.textContent = line;
            frag.appendChild(el);
        });

        terminalOutput.appendChild(frag);

        if (!this.searchQuery) {
            terminalOutput.scrollTop = terminalOutput.scrollHeight;
        }
    }

    showSessionSelector(onSelect, onCancel) {
        if (document.getElementById('sessionSelectorOverlay')) return;

        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'sessionSelectorOverlay';
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

        document.body.classList.add('popup-open');

        const closeOverlay = () => {
            modalOverlay.classList.remove('active');
            setTimeout(() => {
                if (modalOverlay.parentNode) modalOverlay.parentNode.removeChild(modalOverlay);
            }, 200);
            document.body.classList.remove('popup-open');
        };

        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeOverlay();
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
            closeOverlay();
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
            const badge = isClean ? '' : '<div class="live-dot" style="color: var(--yellow);" title="Incomplete/Running"></div>';

            const sessionItem = document.createElement('div');
            sessionItem.className = 'file-item';
            sessionItem.innerHTML = `
                <div class="file-name-display"><span>Boot ${bootNum}</span> ${badge}</div>
                <div class="file-path">${displayString} · ${sessionObj.lines.length}L</div>
            `;
            sessionItem.addEventListener('click', () => {
                this.currentSessionIndex = index;
                closeOverlay();
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
                closeOverlay();
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
        if (visibleLines) {
            Utils.copyToClipboard(visibleLines);
            Utils.logChange('Copied logs to clipboard');
        }
        else Utils.showToast('Nothing to copy', 'warning');
    }

    clearViewer() {
        Utils.logChange('Cleared log viewer');
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