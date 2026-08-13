import { Utils } from './utils.js';
import { AshLooperIcons } from './icons.js';

const SERVICE_D = '/data/adb/service.d';
const POSTMOUNT_D = '/data/adb/post-mount.d';
const POSTFSDATA_D = '/data/adb/post-fs-data.d';

export class ItemsManager {
    constructor(mainInstance) {
        this.app = mainInstance;
        this.items = [];
        this.searchQuery = '';
        this.isScanning = false;
        this.busyIds = new Set();
        this.currentTab = 'modules';
        this.tabs = ['modules', 'scripts'];
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.touchStartY = 0;
        this.touchEndY = 0;
        this.pendingChanges = new Map();
    }

    init() {}

    bindEvents() {
        const searchInput = document.getElementById('items-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.renderList();
            });
        }
        const refreshBtn = document.getElementById('items-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.items = [];
                this.loadItems(true);
            });
        }

        document.querySelectorAll('#itemsTab .filter-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentTab = e.currentTarget.dataset.filter;
                this.renderList();
            });
        });

        document.addEventListener('touchstart', (e) => {
            if (this.app.activeTab !== 'items') return;
            this.touchStartX = e.changedTouches[0].screenX;
            this.touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (this.app.activeTab !== 'items') return;
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
        this.renderList();
    }

    async loadItems(isFirstTime = false) {
        if (this.isScanning) return;
        this.isScanning = true;

        const container = document.getElementById('items-content');
        if (container && this.items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div>
                        <div class="spinner" style="margin: 0 auto 15px auto;"></div>
                        <div style="font-family: var(--font-mono); font-size: 0.9em; color: var(--text-2);">Loading items...</div>
                    </div>
                </div>`;
        }

        try {
            const monitorScripts = this.app.moduleInfo.monitor_scripts !== 'false';

            const scriptCmd = `
                for d in /data/adb/modules/*; do
                    [ -d "$d" ] || continue
                    id="\${d##*/}"
                    dis=0; [ -f "$d/disable" ] && dis=1
                    rem=0; [ -f "$d/remove" ] && rem=1
                    n="$id"
                    if [ -f "$d/module.prop" ]; then
                        n2=$(grep '^name=' "$d/module.prop" | head -n1 | cut -d= -f2- | tr -d '|')
                        [ -n "$n2" ] && n="$n2"
                    fi
                    printf "MOD|%s|%s|%s|%s\\n" "$id" "$dis" "$n" "$rem"
                done
                ${monitorScripts ? `
                for d in /data/adb/service.d /data/adb/post-mount.d /data/adb/post-fs-data.d; do
                    [ -d "$d" ] || continue
                    pref="svc"; [ "$d" = "/data/adb/post-mount.d" ] && pref="pmd"; [ "$d" = "/data/adb/post-fs-data.d" ] && pref="pfd"
                    find "$d" -maxdepth 1 -type f 2>/dev/null | while read -r f; do
                        [ ! -x "$f" ] && [ ! -s "$f" ] && continue
                        b="\${f##*/}"
                        p=$(stat -c %a "$f" 2>/dev/null || echo "755")
                        printf "SCR|%s|%s|0|%s\\n" "$pref" "$b" "$p"
                    done
                done
                for f in /data/adb/ashlooper/*.svc.* /data/adb/ashlooper/*.pmd.* /data/adb/ashlooper/*.pfd.*; do
                    [ -f "$f" ] || continue
                    b="\${f##*/}"
                    p="\${b##*.}"
                    b_ext="\${b%.*}"
                    pref="\${b_ext##*.}"
                    fname="\${b_ext%.*}"
                    printf "SCR|%s|%s|1|%s\\n" "$pref" "$fname" "$p"
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
                    collected.push({
                        kind: 'module',
                        id: id,
                        refId: id,
                        enabled: p[2] === '0',
                        name: p[3],
                        pendingRemoval: p[4] === '1',
                        locked: id === 'AshLooper'
                    });
                } else if (p[0] === 'SCR') {
                    const pref = p[1];
                    const fname = p[2];
                    const isDis = p[3] === '1';
                    const perm = p[4] || '755';
                    collected.push({
                        kind: 'script',
                        id: `${pref}:${fname}`,
                        refId: fname,
                        prefix: pref,
                        name: fname,
                        enabled: !isDis,
                        perm: perm,
                        locked: false
                    });
                }
            }

            this.items = collected;
            if (isFirstTime) Utils.logChange('Loaded items for the first time');
        } catch (error) {
            Utils.showToast('Failed to load modules & scripts', 'error');
        } finally {
            this.isScanning = false;
            this.renderList();
        }
    }

    filtered() {
        const tabItems = this.items.filter(i => this.currentTab === 'modules' ? i.kind === 'module' : i.kind === 'script');
        if (!this.searchQuery) return tabItems;
        return tabItems.filter(item =>
            item.name.toLowerCase().includes(this.searchQuery) ||
            item.id.toLowerCase().includes(this.searchQuery)
        );
    }

    updateUI() {
        this.renderList();
    }

    dirForPrefix(pref) {
        if (pref === 'pmd') return POSTMOUNT_D;
        if (pref === 'pfd') return POSTFSDATA_D;
        return SERVICE_D;
    }

    renderList() {
        if (this.isScanning) return;

        const container = document.getElementById('items-content');
        const footer = document.getElementById('items-footer');
        if (!container) return;

        document.querySelectorAll('#itemsTab .filter-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === this.currentTab);
        });

        const cModules = document.getElementById('count-modules');
        const cScripts = document.getElementById('count-scripts');

        if (cModules) cModules.textContent = this.items.filter(i => i.kind === 'module').length;
        if (cScripts) cScripts.textContent = this.items.filter(i => i.kind === 'script').length;

        if (this.currentTab === 'scripts' && this.app.moduleInfo.monitor_scripts === 'false') {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="width: 40px; height: 40px; opacity: 0.5;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                    </div>
                    <h3>Script Monitoring is Off</h3>
                    <p style="margin-top: 5px;">Enable script monitoring to manage early & late boot scripts.</p>
                    <button type="button" class="refresh-btn" id="btn-enable-scripts" style="margin-top: 15px;">Turn On</button>
                </div>
            `;
            if (footer) footer.textContent = '';

            const btn = document.getElementById('btn-enable-scripts');
            if (btn) {
                btn.onclick = async () => {
                    Utils.showLoadingSpinner(true);
                    await this.app.settingsManager.updateSettingProp('monitor_scripts', 'true');
                    this.app.moduleInfo.monitor_scripts = 'true';
                    this.app.settingsManager.updateUI();
                    Utils.logChange('Enabled Script Monitoring');
                    Utils.showLoadingSpinner(false);
                    this.items = [];
                    this.loadItems(true);
                };
            }
            return;
        }

        const list = this.filtered();

        if (footer) {
            const activeCount = list.filter(i => i.enabled).length;
            const label = this.currentTab === 'modules' ? 'modules' : 'scripts';
            footer.textContent = `${list.length} ${label} · ${activeCount} active`;
        }

        if (list.length === 0) {
            container.innerHTML = `<div class="empty-state"><div>No ${this.currentTab} found</div></div>`;
            return;
        }

        const playIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        const pauseIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;

        container.innerHTML = list.map(item => {
            const isEnabled = item.enabled;
            const badgeClass = isEnabled ? 'ok' : 'bad';
            const badgeText = isEnabled ? 'Active' : 'Disabled';
            const kindClass = item.kind === 'module' ? 'kind-mod' : (item.prefix === 'svc' ? 'kind-svc' : (item.prefix === 'pmd' ? 'kind-pmd' : 'kind-pfd'));
            const kindLabel = item.kind === 'module' ? 'mod' : item.prefix;
            const busy = this.busyIds.has(item.id);
            const displayId = item.kind === 'script' ? 'Boot Script' : item.id;
            const pendingRemoval = !!item.pendingRemoval;

            let actionsHtml;
            if (item.locked) {
                actionsHtml = `<div class="locked-icon-only" title="Protected">${AshLooperIcons.getLockIcon()}</div>`;
            } else if (pendingRemoval) {
                actionsHtml = `<div class="item-actions">
                       <button type="button" class="item-btn success" data-action="restore" data-id="${item.id}" ${busy ? 'disabled' : ''} title="Restore">
                           ${AshLooperIcons.getRefreshIcon()}
                       </button>
                   </div>`;
            } else {
                actionsHtml = `<div class="item-actions">
                       <button type="button" class="item-btn danger" data-action="remove" data-id="${item.id}" ${busy ? 'disabled' : ''} title="Remove">
                           ${AshLooperIcons.getClearIcon()}
                       </button>
                       <button type="button" class="item-btn ${isEnabled ? 'warn' : 'success'}" data-action="toggle" data-id="${item.id}" ${busy ? 'disabled' : ''} title="${isEnabled ? 'Disable' : 'Enable'}">
                           ${isEnabled ? pauseIcon : playIcon}
                       </button>
                   </div>`;
            }

            const finalBadgeClass = pendingRemoval ? 'bad' : badgeClass;
            const finalBadgeText = pendingRemoval ? 'Pending Removal' : badgeText;

            return `
            <div class="module-card ${isEnabled ? 'active' : ''} ${busy ? 'tog-busy' : ''} ${pendingRemoval ? 'pending-removal' : ''}" id="item-${this.sanitizeId(item.id)}">
                <div class="module-info-compact">
                    <h3 class="module-name">${item.name}</h3>
                    <div class="module-id-wrap">
                        <span class="module-id">${displayId}</span>
                        <span class="item-kind-tag ${kindClass}">${kindLabel}</span>
                    </div>
                </div>
                <div class="module-action-compact">
                    <span class="s-row-value ${finalBadgeClass}" style="margin-right:10px;" id="badge-${this.sanitizeId(item.id)}">${finalBadgeText}</span>
                    ${actionsHtml}
                </div>
            </div>`;
        }).join('');

        container.querySelectorAll('.item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                const id = e.currentTarget.dataset.id;
                const item = this.items.find(i => i.id === id);
                if (!item) return;

                if (action === 'remove') this.removeItem(item);
                else if (action === 'toggle') this.toggleItem(item);
                else if (action === 'restore') this.restoreItem(item);
            });
        });
    }

    async toggleItem(item) {
        this.busyIds.add(item.id);
        this.renderList();

        const wantEnable = !item.enabled;

        try {
            if (item.kind === 'module') {
                const modPath = `/data/adb/modules/${item.refId}`;
                const cmd = wantEnable ? `rm -f "${modPath}/disable"` : `touch "${modPath}/disable"`;
                await Utils.ksuExec(cmd);
            } else {
                const pref = item.prefix;
                const dpath = this.dirForPrefix(pref);
                const ashDpath = '/data/adb/ashlooper';
                const activePath = `${dpath}/${item.refId}`;

                const cmd = wantEnable
                    ? `f=\$(ls "${ashDpath}/${item.refId}.${pref}".* 2>/dev/null | head -n1); if [ -n "\$f" ]; then p="\${f##*.}"; rm -f "${activePath}"; mv -f "\$f" "${activePath}"; chmod "\$p" "${activePath}"; else echo "source missing"; fi`
                    : `if [ -f "${activePath}" ]; then p=\$(stat -c %a "${activePath}" 2>/dev/null || echo "755"); mkdir -p "${ashDpath}"; mv -f "${activePath}" "${ashDpath}/${item.refId}.${pref}.\$p"; touch "${activePath}"; chmod 000 "${activePath}"; else echo "source missing"; fi`;

                await Utils.ksuExec(cmd);
            }

            item.enabled = wantEnable;
            Utils.logChange(`${wantEnable ? 'Enabled' : 'Disabled'} ${item.kind}: ${item.name}`);
            Utils.showToast(`${wantEnable ? 'Enabled' : 'Disabled'} "${item.name}"`, wantEnable ? 'success' : 'warning');
        } catch (error) {
            Utils.showToast(`Failed to update ${item.name}`, 'error');
        } finally {
            this.busyIds.delete(item.id);
            this.renderList();
        }
    }

    async removeItem(item) {
        if (item.kind === 'module') {
            const confirmed = await this.showConfirmModal({
                title: 'Remove Module?',
                message: `Mark <b>"${item.name}"</b> for removal? It will be deleted on next reboot. You can restore it until then.`,
                confirmText: 'Yes, Remove',
                cancelText: 'Cancel',
                danger: true
            });
            if (!confirmed) return;

            this.busyIds.add(item.id);
            this.renderList();

            try {
                const modPath = `/data/adb/modules/${item.refId}`;
                await Utils.ksuExec(`touch "${modPath}/remove"`);
                Utils.logChange(`Marked module for removal: ${item.name}`);
                Utils.showToast(`"${item.name}" will be removed on next reboot`, 'success');
                await this.loadItems();
            } catch (error) {
                Utils.showToast(`Failed to mark ${item.name} for removal`, 'error');
            } finally {
                this.busyIds.delete(item.id);
                this.renderList();
            }
            return;
        }

        const confirmed = await this.showConfirmModal({
            title: 'Delete Script?',
            message: `Permanently delete <b>"${item.name}"</b>? This cannot be undone.`,
            confirmText: 'Yes, Delete',
            cancelText: 'Cancel',
            danger: true
        });
        if (!confirmed) return;

        this.busyIds.add(item.id);
        this.renderList();

        try {
            const activeDir = this.dirForPrefix(item.prefix);
            const activePath = `${activeDir}/${item.refId}`;
            const ashDpath = '/data/adb/ashlooper';

            const killCmd = `
                pids=$(pgrep -f "${item.refId}" 2>/dev/null)
                if [ -n "$pids" ]; then
                    for pid in $pids; do
                        kill -9 "$pid" 2>/dev/null
                    done
                    echo "killed:$pids"
                else
                    echo "killed:none"
                fi
                rm -f "${activePath}"
                rm -f "${ashDpath}/${item.refId}.${item.prefix}".*
            `;
            const result = await Utils.ksuExec(killCmd);

            if (result.includes('killed:') && !result.includes('killed:none')) {
                Utils.logChange(`Killed running process for script: ${item.name}`);
            }
            Utils.logChange(`Removed script: ${item.name}`);
            Utils.showToast(`Removed script "${item.name}"`, 'success');

            await this.loadItems();
        } catch (error) {
            Utils.showToast(`Failed to remove ${item.name}`, 'error');
        } finally {
            this.busyIds.delete(item.id);
            this.renderList();
        }
    }

    async restoreItem(item) {
        if (item.kind !== 'module') return;

        this.busyIds.add(item.id);
        this.renderList();

        try {
            const modPath = `/data/adb/modules/${item.refId}`;
            await Utils.ksuExec(`rm -f "${modPath}/remove"`);
            Utils.logChange(`Restored module: ${item.name}`);
            Utils.showToast(`"${item.name}" restored`, 'success');
            await this.loadItems();
        } catch (error) {
            Utils.showToast(`Failed to restore ${item.name}`, 'error');
        } finally {
            this.busyIds.delete(item.id);
            this.renderList();
        }
    }

    sanitizeId(id) {
        return id.replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    showConfirmModal({ title = 'Are you sure?', message = '', confirmText = 'Yes', cancelText = 'Cancel', danger = true } = {}) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'popup-overlay centered active';
            overlay.style.zIndex = '9999';

            const popup = document.createElement('div');
            popup.className = 'popup confirm-modal';
            popup.style.maxWidth = '340px';

            const header = document.createElement('div');
            header.className = 'popup-header';
            header.innerHTML = `<h3 style="${danger ? 'color: var(--red);' : ''}">${title}</h3>`;

            const content = document.createElement('div');
            content.className = 'popup-content confirm-modal-content';
            content.innerHTML = `
                <p class="confirm-modal-message">${message}</p>
                <div class="confirm-modal-actions">
                    <button type="button" class="confirm-modal-btn confirm-modal-cancel" id="confirmModalCancel">${cancelText}</button>
                    <button type="button" class="confirm-modal-btn confirm-modal-yes ${danger ? 'is-danger' : 'is-accent'}" id="confirmModalYes">${confirmText}</button>
                </div>
            `;

            popup.appendChild(header);
            popup.appendChild(content);
            overlay.appendChild(popup);
            document.body.appendChild(overlay);
            document.body.classList.add('popup-open');

            const cleanup = (result) => {
                overlay.classList.remove('active');
                setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
                document.body.classList.remove('popup-open');
                resolve(result);
            };

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) cleanup(false);
            });
            content.querySelector('#confirmModalCancel').addEventListener('click', () => cleanup(false));
            content.querySelector('#confirmModalYes').addEventListener('click', () => cleanup(true));
        });
    }

    _discard(silent = false) {
        this.pendingChanges.clear();
        this.updateUI();
        if (!silent) {
            this.app.pill.hide();
        }
    }

    async applyChanges(silent = false) {
        this.pendingChanges.clear();
    }
}