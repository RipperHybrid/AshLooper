import { Utils } from './utils.js';

export class WhitelistManager {
    constructor(mainInstance) {
        this.app = mainInstance;
        this.currentTab = 'whitelist';
        this.tabs = ['whitelist', 'normal'];
        this.modules = [];
        this.selectedModules = new Set();
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.touchStartY = 0;
        this.touchEndY = 0;
    }

    async init() {
        this.createActionBar();
        this.bindEvents();
    }

    createActionBar() {
        if (!document.getElementById('whitelist-action-bar')) {
            const bar = document.createElement('div');
            bar.id = 'whitelist-action-bar';
            bar.className = 'whitelist-action-bar';
            bar.innerHTML = `
                <span id="whitelist-selected-count">0 Selected</span>
                <button id="whitelist-apply-btn" class="btn">Apply</button>
            `;
            document.querySelector('.whitelist-container').appendChild(bar);
            document.getElementById('whitelist-apply-btn').addEventListener('click', () => this.applyChanges());
        }
    }

    bindEvents() {
        document.querySelectorAll('.filter-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentTab = e.currentTarget.dataset.filter;
                this.selectedModules.clear();
                this.updateActionBar();
                this.updateUI();
            });
        });

        const contentContainer = document.getElementById('modules-content');
        if (contentContainer) {
            contentContainer.addEventListener('touchstart', (e) => {
                this.touchStartX = e.changedTouches[0].screenX;
                this.touchStartY = e.changedTouches[0].screenY;
            }, { passive: true });

            contentContainer.addEventListener('touchend', (e) => {
                this.touchEndX = e.changedTouches[0].screenX;
                this.touchEndY = e.changedTouches[0].screenY;
                this.handleSwipe();
            }, { passive: true });
        }
    }

    handleSwipe() {
        const xDiff = this.touchStartX - this.touchEndX;
        const yDiff = this.touchStartY - this.touchEndY;
        if (Math.abs(yDiff) >= Math.abs(xDiff) * 0.5) return;
        if (Math.abs(xDiff) < 50) return;
        const currentIndex = this.tabs.indexOf(this.currentTab);
        const newIndex = xDiff > 0
            ? (currentIndex + 1) % this.tabs.length
            : (currentIndex - 1 + this.tabs.length) % this.tabs.length;
        this.currentTab = this.tabs[newIndex];
        this.selectedModules.clear();
        this.updateActionBar();
        this.updateUI();
    }

    async loadModules() {
        if (this.modules.length === 0) {
            const container = document.getElementById('modules-content');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div>
                            <div class="spinner" style="margin: 0 auto 15px auto;"></div>
                            <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.9em; color: var(--accent);">Scanning Modules...</div>
                        </div>
                    </div>`;
            }
        }

        try {
            await this.app.settingsManager.loadModuleData();

            let currentWhitelist = this.app.moduleInfo.whitelist || 'AshLooper';
            currentWhitelist = currentWhitelist.replace(/['"\s]/g, '');
            const whitelistArr = currentWhitelist.split(',').filter(Boolean);

            const mdirRaw = await Utils.ksuExec('ls -1 /data/adb/modules/');
            const folders = mdirRaw.split('\n').filter(f => f.trim().length > 0);

            this.modules = [];

            for (const folder of folders) {
                const props = await Utils.getModuleProps(folder);
                const id = props.id ? props.id.replace(/['"\s]/g, '') : folder.replace(/['"\s]/g, '');
                const name = props.name ? props.name.replace(/['"]/g, '') : folder;
                const cleanFolder = folder.replace(/\s/g, '');
                const isWhite = whitelistArr.includes(id) || whitelistArr.includes(cleanFolder);
                this.modules.push({ id, folder, name, whitelisted: isWhite });
            }

            this.updateUI();
        } catch (error) {
            Utils.updateConsole(`Error loading modules: ${error.message}`, 'error');
            Utils.showToast('Failed to load modules', 'error');
        }
    }

    updateUI() {
        document.querySelectorAll('.filter-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === this.currentTab);
        });

        document.getElementById('count-whitelist').textContent = this.modules.filter(m => m.whitelisted).length;
        document.getElementById('count-normal').textContent = this.modules.filter(m => !m.whitelisted).length;

        const container = document.getElementById('modules-content');
        if (!container) return;

        const isWhitelistTab = this.currentTab === 'whitelist';
        const filtered = this.modules.filter(m => m.whitelisted === isWhitelistTab);

        if (filtered.length === 0) {
            container.innerHTML = `<div class="empty-state"><div>No modules in ${this.currentTab}</div></div>`;
            return;
        }

        container.innerHTML = filtered.map(item => {
            const isLocked = item.folder === 'AshLooper' || item.id === 'AshLooper';
            const actionHtml = isLocked
                ? `<button class="btn btn-disabled" disabled>Locked</button>`
                : `<label class="module-checkbox-container">
                       <input type="checkbox" class="module-checkbox" data-id="${item.id}" ${this.selectedModules.has(item.id) ? 'checked' : ''}>
                       <span class="custom-checkbox"></span>
                   </label>`;

            return `
            <div class="module-card ${item.whitelisted ? 'active' : ''} ${this.selectedModules.has(item.id) ? 'selected' : ''}" id="card-${item.id}">
                <div class="module-info-compact">
                    <h3 class="module-name">${item.name}</h3>
                    <span class="module-id">${item.id}</span>
                </div>
                <div class="module-action-compact">${actionHtml}</div>
            </div>`;
        }).join('');

        container.querySelectorAll('.module-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                const card = document.getElementById(`card-${id}`);
                if (e.target.checked) {
                    this.selectedModules.add(id);
                    card.classList.add('selected');
                } else {
                    this.selectedModules.delete(id);
                    card.classList.remove('selected');
                }
                this.updateActionBar();
            });
        });
    }

    updateActionBar() {
        const bar = document.getElementById('whitelist-action-bar');
        const countSpan = document.getElementById('whitelist-selected-count');
        const btn = document.getElementById('whitelist-apply-btn');
        if (!bar) return;

        if (this.selectedModules.size > 0) {
            bar.classList.add('visible');
            const isAdding = this.currentTab === 'normal';
            countSpan.textContent = `${this.selectedModules.size} Selected`;
            btn.textContent = isAdding ? 'Add to Whitelist' : 'Remove Selected';
            btn.className = `btn ${isAdding ? 'mode-add' : 'mode-remove'}`;
            btn.disabled = false;
        } else {
            bar.classList.remove('visible');
        }
    }

    async applyChanges() {
        if (this.selectedModules.size === 0) return;

        const applyBtn = document.getElementById('whitelist-apply-btn');
        const isAdding = this.currentTab === 'normal';

        applyBtn.innerHTML = '<div class="spinner-small" style="border-color: currentColor; border-top-color: transparent; margin: auto;"></div>';
        applyBtn.disabled = true;

        let arr = (this.app.moduleInfo.whitelist || '"AshLooper"')
            .replace(/['"\s]/g, '').split(',').filter(Boolean);

        this.selectedModules.forEach(moduleId => {
            const cleanId = moduleId.replace(/\s/g, '');
            if (isAdding) {
                if (!arr.includes(cleanId)) arr.push(cleanId);
            } else {
                arr = arr.filter(id => id !== cleanId);
            }
        });

        if (!arr.includes('AshLooper')) arr.unshift('AshLooper');

        try {
            await this.app.settingsManager.updateSettingProp('whitelist', `"${arr.join(',')}"`);
            Utils.showToast(`${this.selectedModules.size} module${this.selectedModules.size > 1 ? 's' : ''} ${isAdding ? 'added' : 'removed'}`, 'success');
            this.selectedModules.clear();
            this.updateActionBar();
            await this.loadModules();
        } catch (error) {
            Utils.showToast('Failed to update whitelist', 'error');
            applyBtn.textContent = isAdding ? 'Add to Whitelist' : 'Remove Selected';
            applyBtn.disabled = false;
        }
    }
}
