import { Utils } from './utils.js';
import { FileManager } from './files.js';
import { SettingsManager } from './settings.js';
import { WhitelistManager } from './whitelist.js';
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
        this.settingsLoaded = false;
        this.whitelistLoaded = false;
        this.activeTab = 'logs';

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
        document.body.classList.add('dark-retro-mode');
        AshLooperIcons.renderAll();
        this.updateMainFabIcon();
        this.setupEventListeners();
        this.setupTabNavigation();
        this.setupRefreshButton();
        this.fileManager.loadLogFiles();
        await this.settingsManager.loadModuleData();
        Utils.updateConsole('AshReXcue WebUI V2.5 initialized');
        Utils.updateConsole('Your friendly neighborhood root savior.');
        Utils.updateConsole('Monitoring For Loops...');
        Utils.showToast('Your friendly neighborhood root savior.');
    }

    updateMainFabIcon() {
        const active = this.tabsConfig.find(t => t.id === this.activeTab);
        const badgeIcon = document.querySelector('#fabBadge i');
        if (active && badgeIcon) {
            badgeIcon.innerHTML = AshLooperIcons[active.iconMethod]();
        }
    }

    setupTabNavigation() {
        const fabWrapper = document.querySelector('.fab-wrapper');
        const fabMainBtn = document.getElementById('fabMainBtn');
        const fabMenu = document.getElementById('fabMenu');
        const tabContents = document.querySelectorAll('.tab-content');

        const openFab = () => {
            this.renderFabMenu();
            fabMenu.classList.add('show');
            fabMainBtn.classList.add('active');
        };

        const closeFab = () => {
            fabMenu.classList.remove('show');
            fabMainBtn.classList.remove('active');
        };

        fabMainBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fabMenu.classList.contains('show') ? closeFab() : openFab();
        });

        document.addEventListener('click', (e) => {
            if (fabMenu.classList.contains('show') && !fabWrapper.contains(e.target)) {
                closeFab();
            }
        });

        window.addEventListener('scroll', () => {
            if (fabMenu.classList.contains('show')) closeFab();
        }, { passive: true });

        document.querySelector('.main').addEventListener('touchmove', () => {
            if (fabMenu.classList.contains('show')) closeFab();
        }, { passive: true });

        fabMenu.addEventListener('click', (e) => {
            const cube = e.target.closest('.fab-cube[data-tab]');
            if (!cube) return;

            const tabId = cube.getAttribute('data-tab');
            if (tabId === this.activeTab) {
                closeFab();
                return;
            }

            this.activeTab = tabId;
            this.updateMainFabIcon();

            document.querySelectorAll('.fab-cube[data-tab]').forEach(c => c.classList.remove('active'));
            cube.classList.add('active');

            tabContents.forEach(c => c.classList.remove('active'));
            document.getElementById(`${tabId}Tab`).classList.add('active');

            if (tabId === 'settings' && !this.settingsLoaded) {
                this.settingsManager.loadSettingsTab();
                this.settingsLoaded = true;
            }
            if (tabId === 'whitelist' && !this.whitelistLoaded) {
                this.whitelistManager.init();
                this.whitelistManager.loadModules();
                this.whitelistLoaded = true;
            }

            closeFab();
        });
    }

    renderFabMenu() {
        const fabMenu = document.getElementById('fabMenu');

        const sorted = [
            this.tabsConfig.find(t => t.id === this.activeTab),
            ...this.tabsConfig.filter(t => t.id !== this.activeTab),
        ];

        fabMenu.innerHTML = sorted.map(t => {
            const isActive = t.id === this.activeTab;
            return `
            <button class="fab-cube${isActive ? ' fab-cube-current' : ''}" data-tab="${t.id}">
                <i style="display:flex">${AshLooperIcons[t.iconMethod]()}</i>
                <span>${t.label}</span>
            </button>`;
        }).join('');
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

        const blurInput = (e) => {
            if (document.activeElement && document.activeElement.tagName === 'INPUT' && e.target !== document.activeElement) {
                document.activeElement.blur();
            }
        };

        document.addEventListener('touchstart', blurInput, { passive: true });
        document.addEventListener('mousedown', blurInput, { passive: true });

        const terminal = document.getElementById('terminal');
        if (terminal) {
            terminal.addEventListener('scroll', () => {
                if (document.activeElement && document.activeElement.tagName === 'INPUT') {
                    document.activeElement.blur();
                }
            }, { passive: true });
        }
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
            if (this.currentLogFile) this.displayLogContent(this.getCurrentSessionLines());
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

        createBtn(AshLooperIcons.getSaveIcon(),  'save-btn',    'Save',     () => this.fileManager.saveToDownload());
        createBtn(AshLooperIcons.getCopyIcon(),  'copy-btn',    'Copy',     () => this.copyToClipboard());
        createBtn(AshLooperIcons.getClearIcon(), 'clear-btn',   'Clear',    () => this.clearViewer());
        createBtn('📋 Sessions',                 'session-btn', 'Sessions', () => this.showSessionSelector());
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
        const els = document.querySelectorAll('.save-btn, .copy-btn, .clear-btn, .session-btn, .search-input');
        if (this.currentLogFile) {
            fileNameEl.textContent = this.currentLogFile;
            els.forEach(el => el.style.display = el.tagName === 'BUTTON' ? 'flex' : 'block');
        } else {
            fileNameEl.textContent = '';
            els.forEach(el => el.style.display = 'none');
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
                el.className = 'terminal-line';
                el.innerHTML = `<div class="boot-header">🔄 NEW BOOT SESSION ${bootNum ? '#' + bootNum[1] : ''}</div>`;
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

            if (
                line.includes('CRITICAL') ||
                line.includes('ERROR') ||
                line.includes('FAILED') ||
                line.includes('fu*ked') ||
                line.includes('Disabled module') ||
                line.includes('Disabling ALL') ||
                line.includes('Lockdown Mode Activated') ||
                line.includes('Crash detected')
            ) {
                el.classList.add('error');
            } else if (
                line.includes('WARNING') ||
                line.includes('Stability warning') ||
                line.includes('crashed and restarted') ||
                line.includes('missing') ||
                line.includes('Threshold reached') ||
                line.includes('disabling new modules') ||
                line.includes('activating lockdown') ||
                line.includes('Duplicate instance') ||
                line.includes('Skipping whitelisted')
            ) {
                el.classList.add('warning');
            }

            el.textContent = line;
            terminalOutput.appendChild(el);
        });

        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    showSessionSelector(onSelect, onCancel) {
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
            Utils.removeModal(modalOverlay);
            if (onCancel) onCancel();
        });

        header.appendChild(title);
        header.appendChild(closeBtn);

        const sessionsContent = document.createElement('div');
        sessionsContent.className = 'sessions-content';
        const sessionsList = document.createElement('div');
        sessionsList.className = 'sessions-list';

        const allItem = document.createElement('div');
        allItem.className = 'session-item';
        allItem.innerHTML = `
            <div class="session-boot-idx">ALL</div>
            <div class="session-main-content">
                <div class="session-info-row"><div class="session-time">📂 All Log Data</div></div>
                <div class="session-info-row"><div class="session-lines">Lines: ${this.originalLines.length}</div></div>
            </div>
            <div class="session-action"><button class="session-select-btn">Select</button></div>
        `;
        allItem.querySelector('.session-select-btn').addEventListener('click', () => {
            this.currentSessionIndex = -1;
            Utils.removeModal(modalOverlay);
            this.clearSearch();
            if (onSelect) onSelect();
            else { this.updateSelectedFile(); this.displayLogContent(this.getCurrentSessionLines()); }
        });
        sessionsList.appendChild(allItem);

        this.bootSessions.forEach((sessionObj, index) => {
            const meta = sessionObj.meta;
            const bootNum = meta.bootNum || '??';

            let statusBadge = '';
            if (!meta.hasEnd) {
                const isLast = index === this.bootSessions.length - 1;
                statusBadge = isLast
                    ? `<div class="session-badge active">⚠️ Active Session</div>`
                    : `<div class="session-badge loop">🚫 Bootloop</div>`;
            }

            let displayString = 'Unknown Time';
            if (meta.rctStatus === 'Incorrect') {
                displayString = meta.time && meta.time !== 'Unknown' ? `🕒 ${meta.time}` : '🕒 Time Unsynced';
            } else {
                displayString = meta.date && meta.date !== 'Unknown' ? `📅 ${meta.date} 🕒 ${meta.time}` : '📅 Unknown Date';
            }

            const sessionItem = document.createElement('div');
            sessionItem.className = 'session-item';
            sessionItem.innerHTML = `
                <div class="session-boot-idx">Boot ${bootNum}</div>
                <div class="session-main-content">
                    <div class="session-info-row">
                        <div class="session-time">${displayString}</div>
                        ${statusBadge}
                    </div>
                    <div class="session-info-row">
                        <div class="session-lines">Lines: ${sessionObj.lines.length}</div>
                        <div class="session-lines">RCT: ${meta.rctStatus}</div>
                    </div>
                </div>
                <div class="session-action"><button class="session-select-btn">Select</button></div>
            `;
            sessionItem.querySelector('.session-select-btn').addEventListener('click', () => {
                this.currentSessionIndex = index;
                Utils.removeModal(modalOverlay);
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
                Utils.removeModal(modalOverlay);
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
            terminalOutput.innerHTML = '<div class="welcome-message"><div>AshReXcue WebUI V2.5</div><div>Cleared</div></div>';
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
    window.ashLooperUI = new AshLooperWebUI();
});