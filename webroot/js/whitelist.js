import { Utils } from './utils.js';
import { AshLooperIcons } from './icons.js';

export class WhitelistManager {
    constructor(mainInstance) {
        this.app = mainInstance;
        this.currentTab = 'whitelisted';
        this.tabs = ['whitelisted', 'normal'];
        this.modules = [];
        this.pendingChanges = new Map();
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.touchStartY = 0;
        this.touchEndY = 0;
        this.isScanning = false;
    }

    async init() {
        this.bindEvents();
    }

    bindEvents() {
        document.querySelectorAll('#whitelistTab .filter-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentTab = e.currentTarget.dataset.filter;
                this.updateUI();
            });
        });

        document.addEventListener('touchstart', (e) => {
            if (this.app.activeTab !== 'whitelist') return;
            this.touchStartX = e.changedTouches[0].screenX;
            this.touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (this.app.activeTab !== 'whitelist') return;
            this.touchEndX = e.changedTouches[0].screenX;
            this.touchEndY = e.changedTouches[0].screenY;
            this.handleSwipe();
        }, { passive: true });
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
        this.updateUI();
    }

    async loadModules(isFirstTime = false) {
        if (this.isScanning) return;
        this.isScanning = true;

        const container = document.getElementById('modules-content');
        if (container && this.modules.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div>
                        <div class="spinner" style="margin: 0 auto 15px auto;"></div>
                        <div style="font-family: var(--font-mono); font-size: 0.9em; color: var(--text-2);">Loading items...</div>
                    </div>
                </div>`;
        }

        try {
            await this.app.settingsManager.loadModuleData();
            let currentWhitelist = this.app.moduleInfo.whitelist || 'AshLooper';
            currentWhitelist = currentWhitelist.replace(/['"\s]/g, '');
            const whitelistArr = currentWhitelist.split(',').filter(Boolean);
            const monitorScripts = this.app.moduleInfo.monitor_scripts !== 'false';

            const scriptCmd = `
                for d in /data/adb/modules/*; do
                    [ -d "$d" ] || continue
                    id="\${d##*/}"
                    n="$id"
                    if [ -f "$d/module.prop" ]; then
                        n2=$(grep '^name=' "$d/module.prop" | head -n1 | cut -d= -f2- | tr -d '|')
                        [ -n "$n2" ] && n="$n2"
                    fi
                    printf "MOD|%s|%s\\n" "$id" "$n"
                done
                ${monitorScripts ? `
                for d in /data/adb/service.d /data/adb/post-mount.d /data/adb/post-fs-data.d; do
                    [ -d "$d" ] || continue
                    pref="svc"; [ "$d" = "/data/adb/post-mount.d" ] && pref="pmd"; [ "$d" = "/data/adb/post-fs-data.d" ] && pref="pfd"
                    find "$d" -maxdepth 1 -type f 2>/dev/null | while read -r f; do
                        [ ! -x "$f" ] && [ ! -s "$f" ] && continue
                        b="\${f##*/}"
                        printf "SCR|%s|%s\\n" "$pref" "$b"
                    done
                done
                for f in /data/adb/ashlooper/*.svc.* /data/adb/ashlooper/*.pmd.* /data/adb/ashlooper/*.pfd.*; do
                    [ -f "$f" ] || continue
                    b="\${f##*/}"
                    b_ext="\${b%.*}"
                    pref="\${b_ext##*.}"
                    fname="\${b_ext%.*}"
                    printf "SCR|%s|%s\\n" "$pref" "$fname"
                done
                ` : ''}
            `;

            const out = await Utils.ksuExec(scriptCmd);
            const lines = out.split('\n').filter(l => l.trim().length > 0);

            const collected = [];
            for (const line of lines) {
                const p = line.split('|');
                if (p[0] === 'MOD') {
                    const id = p[1];
                    const isWhite = whitelistArr.includes(id);
                    collected.push({
                        kind: 'module',
                        id: id,
                        refId: id,
                        name: p[2],
                        whitelisted: isWhite
                    });
                } else if (p[0] === 'SCR') {
                    const pref = p[1];
                    const fname = p[2];
                    const id = `${pref}:${fname}`;
                    const isWhite = whitelistArr.includes(id);
                    collected.push({
                        kind: 'script',
                        id: id,
                        refId: fname,
                        prefix: pref,
                        name: fname,
                        whitelisted: isWhite
                    });
                }
            }

            this.modules = collected;
            if (isFirstTime) Utils.logChange('Loaded whitelist modules for the first time');
        } catch (error) {
            Utils.showToast('Failed to load modules', 'error');
        } finally {
            this.isScanning = false;
            this.updateUI();
        }
    }

    updateUI() {
        if (this.isScanning) return;

        document.querySelectorAll('#whitelistTab .filter-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === this.currentTab);
        });

        const cWhite = document.getElementById('count-whitelisted');
        const cNorm = document.getElementById('count-normal');
        if (cWhite) cWhite.textContent = this.modules.filter(m => m.whitelisted).length;
        if (cNorm) cNorm.textContent = this.modules.filter(m => !m.whitelisted).length;

        const container = document.getElementById('modules-content');
        if (!container) return;

        const isWhitelistTab = this.currentTab === 'whitelisted';
        const filtered = this.modules.filter(m => m.whitelisted === isWhitelistTab);

        if (filtered.length === 0) {
            container.innerHTML = `<div class="empty-state"><div>No modules in ${this.currentTab}</div></div>`;
            return;
        }

        container.innerHTML = filtered.map(item => {
            const isLocked = item.kind === 'module' && (item.folder === 'AshLooper' || item.id === 'AshLooper');
            const kindClass = item.kind === 'module' ? 'kind-mod' : (item.prefix === 'svc' ? 'kind-svc' : (item.prefix === 'pmd' ? 'kind-pmd' : 'kind-pfd'));
            const kindLabel = item.kind === 'module' ? 'mod' : item.prefix;
            const tabTypeClass = item.whitelisted ? 'is-whitelisted' : 'is-normal';
            const displayId = item.kind === 'script' ? 'Boot Script' : item.id;

            const isChecked = this.pendingChanges.has(item.id);

            const actionHtml = isLocked
                ? `<div class="locked-icon-only">${AshLooperIcons.getLockIcon()}</div>`
                : `<label class="module-checkbox-container">
                       <input type="checkbox" class="module-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                       <span class="custom-checkbox"></span>
                   </label>`;

            return `
            <div class="module-card ${item.whitelisted ? 'active' : ''} ${tabTypeClass} ${isChecked ? 'selected' : ''}" id="card-${this.sanitizeId(item.id)}">
                <div class="module-info-compact">
                    <h3 class="module-name">${item.name}</h3>
                    <div class="module-id-wrap">
                        <span class="module-id">${displayId}</span>
                        <span class="item-kind-tag ${kindClass}">${kindLabel}</span>
                    </div>
                </div>
                <div class="module-action-compact">${actionHtml}</div>
            </div>`;
        }).join('');

        container.querySelectorAll('.module-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                const card = document.getElementById(`card-${this.sanitizeId(id)}`);
                const item = this.modules.find(m => m.id === id);

                if (e.target.checked) {
                    this.pendingChanges.set(id, !item.whitelisted);
                    if (card) card.classList.add('selected');
                } else {
                    this.pendingChanges.delete(id);
                    if (card) card.classList.remove('selected');
                }

                this.app.updateGlobalPill();
            });
        });
    }

    sanitizeId(id) {
        return id.replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    _discard(silent = false) {
        this.pendingChanges.clear();
        this.updateUI();
        if (!silent) {
            this.app.pill.hide();
            Utils.showToast('Changes discarded', 'info');
        }
    }

    async applyChanges(silent = false) {
        if (this.pendingChanges.size === 0) return;

        let arr = (this.app.moduleInfo.whitelist || '"AshLooper"')
            .replace(/['"\s]/g, '').split(',').filter(Boolean);

        const added = [];
        const removed = [];

        for (const [id, willBeWhitelisted] of this.pendingChanges.entries()) {
            const cleanId = id.replace(/\s/g, '');
            if (willBeWhitelisted) {
                if (!arr.includes(cleanId)) {
                    arr.push(cleanId);
                    added.push(cleanId);
                }
            } else {
                if (arr.includes(cleanId)) removed.push(cleanId);
                arr = arr.filter(i => i !== cleanId);
            }
        }

        if (!arr.includes('AshLooper')) arr.unshift('AshLooper');

        try {
            await this.app.settingsManager.updateSettingProp('whitelist', `"${arr.join(',')}"`);
            for (const id of added) Utils.logChange(`Added "${id}" to whitelist`);
            for (const id of removed) Utils.logChange(`Removed "${id}" from whitelist`);

            this.pendingChanges.clear();
            await this.loadModules();

            if (!silent) {
                Utils.showToast(`Applied changes`, 'success');
                this.app.pill.hide();
            }
        } catch (error) {
            Utils.showToast('Failed to update whitelist', 'error');
            if (!silent) this.app.pill.setSaving(false);
        }
    }
}