import { Utils, ChangesPill } from './utils.js';
import { FileManager } from './files.js';
import { SettingsManager } from './settings.js';
import { WhitelistManager } from './whitelist.js';
import { ItemsManager } from './items.js';
import { AshLooperIcons } from './icons.js';
import { Config } from './config.js';

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
        const env = (typeof ksu !== 'undefined' && typeof ksu.exec === 'function') ? 'KSU WebUI' : 'Localhost';
        Utils.updateConsole('AshReXcue WebUI V2.7 initialized');
        Utils.updateConsole(`Connection: ${env}`);
        Utils.updateConsole('Monitoring For Loops...');

        AshLooperIcons.renderAll();
        this.renderNav();
        this.setupEventListeners();
        this.setupRefreshButton();
        this.fileManager.loadLogFiles();
        await this.settingsManager.loadModuleData();
        await this.settingsManager.sanitizeLoadedValues();
        this.cleanupStaleUpdateFiles();
    }

    async cleanupStaleUpdateFiles() {
        const dir = Config.ashLooperDir;
        try {
            await Utils.ksuExec(`find "${dir}" -maxdepth 1 -name "update_*.status" -mmin +60 -exec rm -f {} + 2>/dev/null; find "${dir}" -maxdepth 1 -name "update_*.out" -mmin +60 -exec rm -f {} + 2>/dev/null; true`);
        } catch (e) {}
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

    async runInitialScan() {
        try {
            await this.refreshBootState();
            await this.whitelistManager.loadModules(false);
            await this.itemsManager.loadItems(false);
        } catch (error) {
            Utils.updateConsole('Initial scan failed', 'error');
        }
    }

    async refreshAll() {
        try {
            await this.settingsManager.loadModuleData();
            await this.refreshBootState();
            if (this.whitelistManager) {
                await this.whitelistManager.loadModules(false);
                this.whitelistManager.updateUI();
            }
            if (this.itemsManager) {
                await this.itemsManager.loadItems(false);
                this.itemsManager.updateUI();
            }
            this.fileManager.loadLogFiles();
            Utils.showToast('Refreshed', 'success');
        } catch (error) {
            Utils.updateConsole('Refresh failed', 'error');
        }
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
        const settingsCount = sm.pendingChanges ? Object.keys(sm.pendingChanges).length : 0;
        const whitelistCount = wm.pendingChanges ? wm.pendingChanges.size : 0;

        const total = settingsCount + whitelistCount;

        let mode = 'default';
        let hasAdd = false;
        let hasRemove = false;

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

                    if (settingsCount > 0) await sm.save(true);
                    if (whitelistCount > 0) await wm.applyChanges(true);

                    this.pill.setSaving(false);
                    this.pill.hide();
                    Utils.showLoadingSpinner(false);
                    Utils.showToast('All changes saved', 'success');
                },
                onDiscard: () => {
                    if (settingsCount > 0) sm.discard(true);
                    if (whitelistCount > 0) wm.discard(true);

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

        if(fileSelectBtn) fileSelectBtn.addEventListener('click', () => this.togglePopup());
        Utils.bindPopupClose('filePopup', 'closeFilePopup');

        const appHeaderBtn = document.getElementById('appHeaderBtn');

        if (appHeaderBtn) {
            appHeaderBtn.style.cursor = 'pointer';
            appHeaderBtn.addEventListener('click', (e) => {
                if (e.target.closest('#globalHelpBtn') || e.target.closest('#jsonViewerBtn') || e.target.closest('#headerRefreshBtn')) return;
                this.openModuleInfoPopup();
            });
        }

        Utils.bindPopupClose('moduleInfoPopup', 'closeModuleInfoPopup');

        const globalHelpBtn = document.getElementById('globalHelpBtn');

        if (globalHelpBtn) {
            globalHelpBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setupGuidePager();
                Utils.openPopup('globalHelpPopup');
                const guidePager = document.getElementById('guidePager');
                if (guidePager) guidePager.scrollLeft = 0;
                if (this.guideSync) this.guideSync();
            });
        }
        Utils.bindPopupClose('globalHelpPopup', 'closeGlobalHelpPopup');

        const jsonViewerBtn = document.getElementById('jsonViewerBtn');
        const jsonCopyBtn = document.getElementById('jsonCopyBtn');

        if (jsonViewerBtn) {
            jsonViewerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openJsonViewer();
            });
        }
        const headerRefreshBtn = document.getElementById('headerRefreshBtn');
        if (headerRefreshBtn) {
            headerRefreshBtn.addEventListener('click', () => this.refreshAll());
        }

        Utils.bindPopupClose('jsonViewerPopup', 'closeJsonViewer');
        if (jsonCopyBtn) {
            jsonCopyBtn.addEventListener('click', () => {
                if (this.currentJsonRaw) {
                    Utils.copyToClipboard(this.currentJsonRaw);
                } else {
                    Utils.showToast('Nothing to copy', 'warning');
                }
            });
        }

        this.firstLoadQuiet = true;
        this.runInitialScan();
        this.firstLoadQuiet = false;

        const checkUpdateBtn = document.getElementById('checkUpdateBtn');
        const activityLogBtn = document.getElementById('activityLogBtn');
        const activityClearBtn = document.getElementById('activityClearBtn');
        const activitySaveBtn = document.getElementById('activitySaveBtn');

        if (checkUpdateBtn) checkUpdateBtn.addEventListener('click', () => this.openUpdatePopup());
        if (activityLogBtn) activityLogBtn.addEventListener('click', () => this.openActivityLog());
        if (activityClearBtn) activityClearBtn.addEventListener('click', () => this.clearActivityLog());
        if (activitySaveBtn) activitySaveBtn.addEventListener('click', () => this.saveActivityLog());

        Utils.bindPopupClose('activityLogPopup', 'closeActivityLog');
        Utils.bindPopupClose('changelogPopup', 'closeChangelogPopup');
        Utils.bindPopupClose('updatePopup', 'closeUpdatePopup');


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

    setupGuidePager() {
        if (this.guidePagerBound) return;
        const pager = document.getElementById('guidePager');
        const popup = document.getElementById('globalHelpPopup');
        const dots = document.querySelectorAll('#guideDots .guide-dot');
        if (!pager || !popup) return;
        this.guidePagerBound = true;

        this.guideSync = () => {
            const w = pager.clientWidth || 1;
            const idx = Math.round(pager.scrollLeft / w);
            dots.forEach((d, i) => d.classList.toggle('active', i === idx));
        };

        pager.addEventListener('scroll', this.guideSync, { passive: true });

        ['touchstart', 'touchmove', 'touchend'].forEach(evt => {
            popup.addEventListener(evt, (e) => e.stopPropagation(), { passive: true });
        });

        dots.forEach(d => {
            d.addEventListener('click', () => {
                const page = parseInt(d.dataset.page, 10) || 0;
                pager.scrollTo({ left: page * pager.clientWidth, behavior: 'smooth' });
            });
        });
    }

    async openModuleInfoPopup() {
        this.settingsManager.updateModuleInfoPopup();
        Utils.openPopup('moduleInfoPopup');
        await this.settingsManager.loadModuleData();
        this.settingsManager.updateModuleInfoPopup();
    }

    async openJsonViewer() {
        Utils.openPopup('jsonViewerPopup');
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

    async installUpdate(url, version) {
        const btn = document.getElementById('downloadUpdateBtn');
        if (!btn || btn.classList.contains('busy')) return;
        const originalHtml = btn.innerHTML;
        btn.classList.add('busy');

        const termEl = document.getElementById('installTermOutput');
        const barEl = document.getElementById('installProgressBar');
        const stageEl = document.getElementById('installStage');
        const titleEl = document.getElementById('installTermTitle');
        const closeBtn = document.getElementById('installTermCloseBtn');
        const saveBtn = document.getElementById('installTermSaveBtn');

        let pct = 3;
        const setBar = (value, cls) => {
            pct = value;
            barEl.style.width = `${value}%`;
            barEl.className = `install-progress-bar${cls ? ' ' + cls : ''}`;
        };

        this.installTermText = '';
        this.installTermVersion = version || '';
        termEl.textContent = '';
        setBar(3);
        stageEl.textContent = 'Preparing...';
        titleEl.textContent = `Installing${version ? ' v' + version : ''}`;
        closeBtn.disabled = true;
        closeBtn.onclick = () => Utils.closePopup('installTermPopup');
        saveBtn.onclick = () => this.saveInstallLog();
        Utils.openPopup('installTermPopup');

        const stamp = Date.now();
        const status = `${Config.ashLooperDir}/update_${stamp}.status`;
        const outFile = `${Config.ashLooperDir}/update_${stamp}.out`;
        let zip = '';
        let result = '';

        const render = (text) => {
            const clean = text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
            if (clean === this.installTermText) return;
            this.installTermText = clean;
            termEl.textContent = clean;
            termEl.scrollTop = termEl.scrollHeight;
        };

        try {
            if (!Utils.isSafeUrl(url)) throw new Error('Invalid download URL');
            zip = `${Config.ashLooperDir}/${Utils.getUpdateFileName(url, version)}`;
            const installCmd = Utils.buildInstallCommand(zip);

            const worker = [
                Utils.getBusyboxCmd(),
                `mkdir -p "${Config.ashLooperDir}"`,
                `rm -f "${status}" "${outFile}"`,
                `: > "${outFile}"`,
                `( trap '' HUP; if [ -z "$bb" ]; then echo FAIL_BB > "${status}"; exit 0; fi; echo DOWNLOADING > "${status}"; if "$bb" wget -q -T ${Config.timeouts.wgetDownloadSeconds} -O "${zip}" "${url}" && [ -s "${zip}" ]; then echo INSTALLING > "${status}"; ( ${installCmd} ) >"${outFile}" 2>&1; rc=$?; rm -f "${zip}"; if [ $rc -eq 0 ]; then echo OK > "${status}"; else echo FAIL_INSTALL > "${status}"; fi; else rm -f "${zip}"; echo FAIL_DL > "${status}"; fi ) </dev/null >/dev/null 2>&1 &`
            ].join('; ');

            await Utils.ksuExecTimeout(worker, 10000);

            let deadline = Date.now() + Config.timeouts.download;
            let state = '';
            while (Date.now() < deadline) {
                await new Promise(resolve => setTimeout(resolve, 700));
                let raw = '';
                try {
                    raw = await Utils.ksuExecTimeout(`cat "${status}" 2>/dev/null; echo "@@OUT@@"; tail -c 6000 "${outFile}" 2>/dev/null; true`, 5000);
                } catch (e) {
                    raw = '';
                }
                const parts = raw.split('@@OUT@@');
                const s = (parts[0] || '').trim();
                const out = (parts[1] || '').replace(/^\n/, '');

                if (s !== state) {
                    state = s;
                    if (s === 'INSTALLING') deadline = Date.now() + Config.timeouts.install;
                    if (s === 'DOWNLOADING') { setBar(Math.max(pct, 12)); stageEl.textContent = 'Downloading...'; }
                    else if (s === 'INSTALLING') { setBar(Math.max(pct, 55)); stageEl.textContent = 'Installing...'; }
                }
                if (s === 'DOWNLOADING') setBar(Math.min(50, pct + 1.2));
                else if (s === 'INSTALLING') setBar(Math.min(95, pct + 0.4));
                if (out) render(out);

                if (s === 'OK' || s.startsWith('FAIL')) {
                    result = s;
                    break;
                }
            }

            if (result !== 'OK') {
                const reasons = {
                    FAIL_BB: 'Busybox not found',
                    FAIL_DL: 'Download failed',
                    FAIL_INSTALL: 'Install failed'
                };
                throw new Error(reasons[result] || 'Timed out');
            }

            setBar(100, 'done');
            titleEl.textContent = 'Installed';
            stageEl.textContent = 'Done. Reboot to apply.';
            Utils.showToast('Module installed. Reboot to apply', 'success');
            Utils.updateConsole(`Module installed from ${zip}`, 'success');
            Utils.logChange(`Installed update ${version || ''}`.trim());
            btn.classList.remove('busy');
            btn.classList.replace('primary', 'success');
            btn.innerHTML = `${AshLooperIcons.getCheckIcon()} Installed, reboot to apply`;
            btn.onclick = null;
        } catch (e) {
            const msg = e.message || 'Install failed';
            setBar(Math.max(pct, 8), 'failed');
            titleEl.textContent = 'Install failed';
            stageEl.textContent = msg;
            this.installTermText += `${this.installTermText && !this.installTermText.endsWith('\n') ? '\n' : ''}[FAILED] ${msg}\n`;
            termEl.textContent = this.installTermText;
            termEl.scrollTop = termEl.scrollHeight;
            Utils.showToast(msg, 'error');
            Utils.updateConsole(`Update failed: ${msg}`, 'error');
            btn.innerHTML = originalHtml;
            btn.classList.remove('busy');
        } finally {
            closeBtn.disabled = false;
            try {
                await Utils.ksuExecTimeout(`rm -f "${zip}" "${status}" "${outFile}"`, 5000);
            } catch (e) {}
        }
    }

    saveInstallLog() {
        if (!this.installTermText) {
            Utils.showToast('Nothing to save', 'warning');
            return;
        }
        const text = [
            'AshReXcue Install Log',
            `Version: ${this.installTermVersion || 'unknown'}`,
            `Exported: ${new Date().toISOString()}`,
            '',
            this.installTermText
        ].join('\n');
        const destFilename = `AshReXcue-InstallLog-${Date.now()}.txt`;
        const destPath = `${Config.downloadDir}/${destFilename}`;
        const tempPath = `${Config.ashLooperDir}/${destFilename}`;
        const b64 = btoa(unescape(encodeURIComponent(text)));

        Utils.ksuExec(`printf '%s' '${b64}' | base64 -d > "${tempPath}"`)
            .then(() => Utils.ksuExec(`cp "${tempPath}" "${destPath}"`))
            .then(() => Utils.ksuExec(`rm "${tempPath}"`))
            .then(() => {
                Utils.updateConsole(`Saved to ${destPath}`, 'success');
                Utils.showToast('Install log saved', 'success');
            })
            .catch(err => {
                Utils.showToast(`Save failed: ${err.message}`, 'error');
            });
    }

    async showChangelog(url) {
        const contentEl = document.getElementById('changelogContent');
        if (!contentEl) return;

        contentEl.innerHTML = `<div class="popup-loading"><div class="spinner"></div><div class="popup-loading-text">Loading release notes...</div></div>`;
        Utils.openPopup('changelogPopup');

        this.changelogReqId = (this.changelogReqId || 0) + 1;
        const reqId = this.changelogReqId;

        await Utils.nextFrame();

        try {
            if (!Utils.isSafeUrl(url)) throw new Error('Invalid changelog URL');
            const cmd = `${Utils.getBusyboxCmd()}; "$bb" wget -q -O - -T ${Config.timeouts.wgetSeconds} "${url}"`;
            const raw = await Utils.ksuExecTimeout(cmd, Config.timeouts.fetch);
            if (reqId !== this.changelogReqId) return;
            if (!raw || raw.trim() === '') throw new Error('Empty response');
            contentEl.innerHTML = `<div class="md-content">${this.renderMarkdown(raw)}</div>`;
        } catch (e) {
            if (reqId !== this.changelogReqId) return;
            contentEl.innerHTML = `<div class="debug-err err-box">Failed to load release notes.</div>`;
        }
    }

    renderMarkdown(raw) {
        const fence = '\u0060\u0060\u0060';
        const inline = (text) => this.escapeHtml(text)
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/(^|[^*])\*([^*\s][^*]*)\*(?!\*)/g, '$1<em>$2</em>')
            .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<span class="md-link">$1</span>');

        const lines = raw.replace(/\r/g, '').split('\n');
        let html = '';
        let list = null;
        let inCode = false;
        let code = [];

        const closeList = () => {
            if (list) {
                html += `</${list}>`;
                list = null;
            }
        };
        const openList = (type) => {
            if (list !== type) {
                closeList();
                html += `<${type}>`;
                list = type;
            }
        };

        for (const line of lines) {
            const l = line.trim();

            if (l.startsWith(fence)) {
                if (inCode) {
                    html += `<pre>${this.escapeHtml(code.join('\n'))}</pre>`;
                    code = [];
                    inCode = false;
                } else {
                    closeList();
                    inCode = true;
                }
                continue;
            }
            if (inCode) {
                code.push(line);
                continue;
            }
            if (!l) {
                closeList();
                continue;
            }

            const heading = l.match(/^(#{1,4})\s+(.*)$/);
            const bullet = l.match(/^[*-]\s+(.*)$/);
            const numbered = l.match(/^\d+\.\s+(.*)$/);
            const quote = l.match(/^>\s?(.*)$/);

            if (/^(-{3,}|\*{3,})$/.test(l)) {
                closeList();
                html += '<hr>';
            } else if (heading) {
                closeList();
                const n = heading[1].length;
                html += `<h${n}>${inline(heading[2])}</h${n}>`;
            } else if (bullet) {
                openList('ul');
                html += `<li>${inline(bullet[1])}</li>`;
            } else if (numbered) {
                openList('ol');
                html += `<li>${inline(numbered[1])}</li>`;
            } else if (quote) {
                closeList();
                html += `<blockquote>${inline(quote[1])}</blockquote>`;
            } else {
                closeList();
                html += `<p>${inline(l)}</p>`;
            }
        }

        closeList();
        if (inCode && code.length) html += `<pre>${this.escapeHtml(code.join('\n'))}</pre>`;
        return html;
    }

    async openUpdatePopup() {
        const titleEl = document.getElementById('updatePopupTitle');
        const contentEl = document.getElementById('updatePopupContent');
        if (!titleEl || !contentEl) return;

        titleEl.textContent = 'Check Update';
        contentEl.innerHTML = `<div class="popup-loading"><div class="spinner"></div><div class="popup-loading-text">Fetching module info...</div></div>`;

        Utils.openPopup('updatePopup');

        this.updateReqId = (this.updateReqId || 0) + 1;
        const reqId = this.updateReqId;

        await Utils.nextFrame();

        let raw = '';
        try {
            raw = await Utils.ksuExecTimeout(
                `${Utils.getBusyboxCmd()}; ` +
                `[ -z "$bb" ] && { echo "NO_BUSYBOX"; exit 0; }; ` +
                `"$bb" wget -q -O - -T ${Config.timeouts.wgetSeconds} -t 1 ${Config.updateManifestUrl} 2>/dev/null || echo "FETCH_FAILED"`,
                Config.timeouts.fetch
            );
        } catch (e) {
            raw = 'FETCH_FAILED';
        }

        if (reqId !== this.updateReqId) return;

        this.renderUpdateResult(raw, contentEl);
    }

    renderUpdateResult(raw, contentEl) {
        const info = this.moduleInfo;
        const currentVersion = info.version || '—';
        const currentVersionCode = info.versionCode || '—';

        const headerHtml = `
            <div class="s-row border-none mb-4 pad-12-4">
                <div class="s-row-body">
                    <div class="s-row-label">Current Version</div>
                    <div class="s-row-sub">Installed module version</div>
                </div>
                <span class="s-row-value ok text-right">${this.escapeHtml(currentVersion)} (${this.escapeHtml(currentVersionCode)})</span>
            </div>`;

        let updateJson = null;
        const trimmed = (raw || '').trim();

        if (trimmed && trimmed !== 'FETCH_FAILED' && trimmed !== 'NO_BUSYBOX') {
            try { updateJson = JSON.parse(trimmed); } catch (e) { updateJson = null; }
        }

        if (!updateJson) {
            const reason = trimmed === 'NO_BUSYBOX'
                ? 'Busybox not found on device.'
                : trimmed === 'FETCH_FAILED'
                ? 'Network request failed (no connection or host unreachable).'
                : 'Could not parse update manifest.';
            contentEl.innerHTML = headerHtml + `<div class="debug-err err-box">${this.escapeHtml(reason)}</div>`;
            return;
        }

        const remoteVersion = updateJson.version || '—';
        const remoteVersionCode = updateJson.versionCode || '—';
        const zipUrl = updateJson.zipUrl || '';
        const changelogUrl = updateJson.changelog || '';

        const currentCodeNum = parseInt(String(currentVersionCode).replace(/[^0-9]/g, ''), 10);
        const remoteCodeNum = parseInt(String(remoteVersionCode).replace(/[^0-9]/g, ''), 10);

        let isUpdateAvailable = false;
        if (!isNaN(remoteCodeNum) && !isNaN(currentCodeNum)) {
            isUpdateAvailable = remoteCodeNum > currentCodeNum;
        } else {
            isUpdateAvailable = currentVersion !== remoteVersion;
        }

        const isTestBuild = currentVersion !== '—' && !/^\d+(\.\d+)*$/.test(String(currentVersion).trim());

        const changelogButton = (label) => `
            <button type="button" id="viewChangelogBtn" class="action-btn secondary">
                ${AshLooperIcons.getFileTextIcon()}
                ${label}
            </button>`;

        let actionButtons = '';
        if ((isUpdateAvailable || isTestBuild) && zipUrl) {
            actionButtons = `
            <div class="action-stack">
                <button type="button" id="downloadUpdateBtn" class="action-btn primary">
                    ${AshLooperIcons.getInstallIcon()}
                    Install v${this.escapeHtml(remoteVersion)}
                </button>
                ${changelogUrl ? changelogButton('View Changelog') : ''}
            </div>`;
        } else if (!isUpdateAvailable && changelogUrl) {
            actionButtons = `
            <div class="action-stack">
                ${changelogButton('View Release Notes')}
            </div>`;
        }

        const banner = isTestBuild
            ? `<div class="info-banner mb-14 text-red"><i data-icon="warning"></i><span>Test build detected (${this.escapeHtml(currentVersion)}). Installing will replace it with the official release v${this.escapeHtml(remoteVersion)}.</span></div>`
            : isUpdateAvailable
            ? `<div class="info-banner mb-14"><i data-icon="warning"></i><span>A newer version is available.</span></div>`
            : `<div class="info-banner warn mb-14"><i data-icon="infoCircle"></i><span>You are on the latest available version.</span></div>`;

        contentEl.innerHTML = headerHtml + banner + `
            <div class="s-row border-none pad-12-4">
                <div class="s-row-body">
                    <div class="s-row-label">Remote Version</div>
                    <div class="s-row-sub">Latest release</div>
                </div>
                <span class="s-row-value ok text-right">${this.escapeHtml(remoteVersion)} (${this.escapeHtml(remoteVersionCode)})</span>
            </div>
            ${actionButtons}`;

        const viewChangelogBtn = document.getElementById('viewChangelogBtn');
        const downloadUpdateBtn = document.getElementById('downloadUpdateBtn');

        if (viewChangelogBtn) viewChangelogBtn.onclick = () => this.showChangelog(changelogUrl);
        if (downloadUpdateBtn) downloadUpdateBtn.onclick = () => this.installUpdate(zipUrl, remoteVersion);

        AshLooperIcons.renderAll();
    }

    async openActivityLog() {
        Utils.openPopup('activityLogPopup');
        this.renderActivityLog();
    }

    renderActivityLog() {
        const content = document.getElementById('activityLogContent');
        if (!content) return;
        const history = Utils.commandHistory;
        if (history.length === 0) {
            content.innerHTML = `<div class="debug-empty">No commands executed yet.</div>`;
            return;
        }
        content.innerHTML = history.slice().reverse().map((entry, idx) => {
            return `
            <div class="debug-entry">
                <div class="debug-entry-head">
                    <span>#${history.length - idx}</span>
                    <span>${this.escapeHtml(entry.time)}</span>
                    ${AshLooperIcons.getEntryCopyButtonHtml(history.length - idx)}
                </div>
                <div class="debug-cmd">${this.escapeHtml(entry.command)}</div>
                <div class="${entry.error ? 'debug-err' : 'debug-out'}">${this.escapeHtml(entry.error || entry.output || '(empty)')}</div>
            </div>
            `;
        }).join('');
        content.querySelectorAll('.debug-entry-copy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.copyId, 10);
                this.copyEntryBlock(id);
            });
        });
    }

    copyEntryBlock(id) {
        const idx = Utils.commandHistory.length - 1 - id;
        if (idx < 0 || idx >= Utils.commandHistory.length) {
            Utils.showToast('Entry not found', 'warning');
            return;
        }
        const entry = Utils.commandHistory[idx];
        const block = [
            `#${id}  ${entry.time}`,
            `CMD: ${entry.command}`,
            entry.error ? `ERR: ${entry.error}` : `OUT: ${entry.output || '(empty)'}`
        ].join('\n');
        Utils.copyToClipboard(block);
        Utils.showToast(`Entry #${id} copied`, 'success');
    }

    saveActivityLog() {
        if (!Utils.commandHistory.length) {
            Utils.showToast('Nothing to save', 'warning');
            return;
        }
        const lines = [
            `AshReXcue Activity Log`,
            `Exported: ${new Date().toISOString()}`,
            `Entries: ${Utils.commandHistory.length}`,
            ''
        ];
        Utils.commandHistory.forEach((entry, idx) => {
            lines.push(`#${idx + 1}  ${entry.time}`);
            lines.push(`CMD: ${entry.command}`);
            lines.push(entry.error ? `ERR: ${entry.error}` : `OUT: ${entry.output || '(empty)'}`);
            lines.push('');
        });
        const text = lines.join('\n');
        const destFilename = `AshReXcue-ActivityLog-${Date.now()}.txt`;
        const destPath = `${Config.downloadDir}/${destFilename}`;
        const tempPath = `${Config.ashLooperDir}/${destFilename}`;
        const b64 = btoa(unescape(encodeURIComponent(text)));

        Utils.updateConsole(`Saving activity log to ${destPath}`, 'info');
        Utils.ksuExec(`printf '%s' '${b64}' | base64 -d > "${tempPath}"`)
            .then(() => Utils.ksuExec(`cp "${tempPath}" "${destPath}"`))
            .then(() => Utils.ksuExec(`rm "${tempPath}"`))
            .then(() => {
                Utils.updateConsole(`Saved to ${destPath}`, 'success');
                Utils.showToast('Activity log saved', 'success');
            })
            .catch(err => {
                Utils.updateConsole(`Save failed: ${err.message}`, 'error');
                Utils.showToast(`Save failed: ${err.message}`, 'error');
            });
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
        if (popup.classList.contains('active')) Utils.closePopup('filePopup');
        else Utils.openPopup('filePopup');
    }
    closePopup() {
        Utils.closePopup('filePopup');
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
                    statusHtml = ' <span class="status-note">(Incomplete/Running)</span>';
                }
            } else if (this.bootSessions.length > 0) {
                const lastSession = this.bootSessions[this.bootSessions.length - 1];
                if (lastSession && !lastSession.meta.hasEnd) {
                    statusHtml = ' <span class="status-note">(Latest: Running)</span>';
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
            const badge = isClean ? '' : '<div class="live-dot text-yellow" title="Incomplete/Running"></div>';

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
            terminalOutput.innerHTML = '<div class="empty-state"><div class="empty-icon"><i data-icon="fabLogs"></i></div><h3>AshReXcue V2.7</h3><p>Cleared</p></div>';
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