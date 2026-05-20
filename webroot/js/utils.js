import { Config } from './main.js';

export class ChangesPill {
    constructor({ onSave, onDiscard } = {}) {
        this.onSave = onSave;
        this.onDiscard = onDiscard;
        this.minimized = false;
        this._bound = false;
        this.autoCloseTimer = null;

        this.pill = document.getElementById('changes-pill');
        this.miniEl = document.getElementById('cp-mini');
        this.countEl = document.getElementById('cp-count');
        this.miniCountEl = document.getElementById('cp-mini-count');
        this.labelEl = document.getElementById('cp-expanded-label');
        this.saveBtn = document.getElementById('cp-btn-save');
        this.discardBtn = document.getElementById('cp-btn-discard');

        if (this.pill) {
            this.pill.addEventListener('mouseenter', () => this.clearAutoClose());
            this.pill.addEventListener('mouseleave', () => {
                if (!this.minimized && this.pill.classList.contains('visible')) {
                    this.startAutoClose();
                }
            });
            this.pill.addEventListener('touchstart', () => this.clearAutoClose(), { passive: true });
            this.pill.addEventListener('touchend', () => {
                if (!this.minimized && this.pill.classList.contains('visible')) {
                    this.startAutoClose();
                }
            }, { passive: true });
        }
    }

    _bind() {
        if (this._bound) return;
        this._bound = true;

        if (this.miniEl) this.miniEl.addEventListener('click', () => this.expand());
        if (this.labelEl) this.labelEl.addEventListener('click', () => this.minimize());

        if (this.discardBtn) {
            this.discardBtn.addEventListener('click', () => {
                if (this.onDiscard) this.onDiscard();
            });
        }

        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => {
                if (this.onSave) this.onSave();
            });
        }
    }

    update(count, { onSave, onDiscard } = {}) {
        if (onSave) this.onSave = onSave;
        if (onDiscard) this.onDiscard = onDiscard;
        this._bind();

        if (count > 0) {
            if (this.countEl) this.countEl.textContent = count;
            if (this.miniCountEl) this.miniCountEl.textContent = count + ' Unsaved';
            if (this.pill) {
                this.pill.classList.add('visible');
                this._setMinimized(this.minimized);
                if (!this.minimized) this.startAutoClose();
            }
        } else {
            this.hide();
        }
    }

    startAutoClose() {
        this.clearAutoClose();
        this.autoCloseTimer = setTimeout(() => {
            if (!this.minimized) this.minimize();
        }, 4000);
    }

    clearAutoClose() {
        if (this.autoCloseTimer) {
            clearTimeout(this.autoCloseTimer);
            this.autoCloseTimer = null;
        }
    }

    expand() {
        this.minimized = false;
        this._setMinimized(false);
        this.startAutoClose();
    }

    minimize() {
        this.minimized = true;
        this._setMinimized(true);
        this.clearAutoClose();
    }

    hide() {
        if (this.pill) this.pill.classList.remove('visible');
        this.minimized = false;
        this.clearAutoClose();
    }

    setSaving(val) {
        if (this.saveBtn) {
            this.saveBtn.disabled = val;
            this.saveBtn.style.opacity = val ? '0.5' : '1';
        }
    }

    _setMinimized(val) {
        if (this.pill) this.pill.classList.toggle('minimized', val);
    }
}

export class Utils {
    static cachedToken = null;
    static cachedPort = null;
    static activityTracker = null;
    static lastActivityTime = Date.now();

    static async getServerPort() {
        if (this.cachedPort) return this.cachedPort;
        const port = window.location.port;
        if (port) { this.cachedPort = port; return port; }
        return "80";
    }

    static async getAuthToken() {
        if (this.cachedToken) return this.cachedToken;
        const hashToken = window.location.hash.substring(1);
        if (hashToken) {
            this.cachedToken = hashToken;
            history.replaceState(null, null, ' ');
            this.startActivityTracking();
            return this.cachedToken;
        }
        throw new Error("Authentication failed");
    }

    static startActivityTracking() {
        if (this.activityTracker) return;
        const trackActivity = () => { this.lastActivityTime = Date.now(); };
        ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(event => {
            document.addEventListener(event, trackActivity, { passive: true });
        });
        this.activityTracker = setInterval(() => {
            if (Date.now() - this.lastActivityTime < 20000) this.sendHeartbeat();
        }, 20000);
    }

    static async sendHeartbeat() {
        try {
            const token = await this.getAuthToken();
            const port = await this.getServerPort();
            await fetch(`http://127.0.0.1:${port}/cgi-bin/exec`, {
                method: 'POST',
                headers: { 'X-Ash-Token': token, 'Content-Type': 'text/plain' },
                body: 'date'
            });
        } catch (error) {}
    }

    static handleServerShutdown() {
        if (this.activityTracker) {
            clearInterval(this.activityTracker);
            this.activityTracker = null;
        }
        this.updateConsole('WebUI server session ended', 'warning');
        const terminalOutput = document.getElementById('terminalOutput');
        if (terminalOutput) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'terminal-line warning';
            messageDiv.style.textAlign = 'center';
            messageDiv.style.padding = '20px';
            messageDiv.innerHTML = '⚠️ WebUI Session Ended';
            terminalOutput.appendChild(messageDiv);
        }
    }

    static ksuExec(command) {
        this.lastActivityTime = Date.now();
        if (typeof ksu !== 'undefined' && typeof ksu.exec === 'function') {
            return new Promise((resolve, reject) => {
                const callbackName = `exec_callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                window[callbackName] = (errno, stdout, stderr) => {
                    delete window[callbackName];
                    if (errno !== 0) reject(new Error(stderr || `Error ${errno}`));
                    else resolve(stdout);
                };
                ksu.exec(command, "{}", callbackName);
            });
        } else {
            return new Promise(async (resolve, reject) => {
                try {
                    const port = await this.getServerPort();
                    const token = await this.getAuthToken();
                    const response = await fetch(`http://127.0.0.1:${port}/cgi-bin/exec`, {
                        method: 'POST',
                        headers: { 'X-Ash-Token': token, 'Content-Type': 'text/plain' },
                        body: command
                    });
                    if (!response.ok) {
                        if (response.status === 403) throw new Error("Security Error: Invalid token");
                        if (!response.status) { this.handleServerShutdown(); throw new Error("Server connection lost"); }
                        throw new Error(`HTTP error: ${response.status}`);
                    }
                    const responseText = await response.text();
                    let data;
                    try { data = JSON.parse(responseText); }
                    catch (e) { throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`); }
                    if (data.code !== 0) reject(new Error((data.stdout || "Command failed").replace(/\\n/g, '\n')));
                    else resolve((data.stdout || "").replace(/\\n/g, '\n'));
                } catch (error) {
                    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('connection lost')) {
                        this.handleServerShutdown();
                    }
                    reject(error);
                }
            });
        }
    }

    static async getModuleProps(moduleId) {
        try {
            const propFile = `/data/adb/modules/${moduleId}/module.prop`;
            const result = await this.ksuExec(`cat "${propFile}" 2>/dev/null`);
            const props = {};
            result.split('\n').forEach(line => {
                const idx = line.indexOf('=');
                if (idx !== -1) {
                    props[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
                }
            });
            return props;
        } catch { return {}; }
    }

    static showToast(message, type = 'info', duration = 3000) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
            warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };
        toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    static updateConsole(message, type = 'info') {
        const terminalOutput = document.getElementById('terminalOutput');
        if (!terminalOutput) return;
        const lineElement = document.createElement('div');
        lineElement.className = `terminal-line ${type}`;
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: true });
        lineElement.textContent = `[${timestamp}] ${message}`;
        terminalOutput.appendChild(lineElement);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    static showLoadingSpinner(show) {}

    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.updateConsole('Logs copied to clipboard', 'success');
        } catch (error) {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                this.updateConsole('Logs copied to clipboard', 'success');
            } catch (err) {
                this.updateConsole('Failed to copy logs', 'error');
            }
            document.body.removeChild(textarea);
        }
    }

    static removeModal(overlay) {
        overlay.style.animation = 'fadeOut 0.3s ease-out forwards';
        if (overlay.firstChild) overlay.firstChild.style.animation = 'scaleOut 0.3s ease-out forwards';
        setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 300);
    }

    static stopActivityTracking() {
        if (this.activityTracker) {
            clearInterval(this.activityTracker);
            this.activityTracker = null;
        }
    }
}

window.addEventListener('beforeunload', () => { Utils.stopActivityTracking(); });