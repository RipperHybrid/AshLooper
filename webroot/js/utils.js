import { Config } from './config.js';

export class Utils {
    static cachedToken = null;
    static cachedPort = null;
    static activityTracker = null;
    static lastActivityTime = Date.now();

    static async getServerPort() {
        if (this.cachedPort) return this.cachedPort;
        try {
            const response = await fetch('/nexus/server_port');
            const portText = await response.text();
            this.cachedPort = portText.trim();
            return this.cachedPort;
        } catch (error) {
            throw new Error("Server port not available");
        }
    }

    static async getAuthToken() {
        if (this.cachedToken) return this.cachedToken;
        try {
            const response = await fetch('/nexus/uplink_key');
            const tokenText = await response.text();
            this.cachedToken = tokenText.trim();
            this.startActivityTracking();
            return this.cachedToken;
        } catch (error) {
            throw new Error("Authentication failed");
        }
    }

    static startActivityTracking() {
        if (this.activityTracker) return;
        const trackActivity = () => {
            this.lastActivityTime = Date.now();
        };
        ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(event => {
            document.addEventListener(event, trackActivity, { passive: true });
        });
        this.activityTracker = setInterval(() => {
            const timeSinceLastActivity = Date.now() - this.lastActivityTime;
            if (timeSinceLastActivity < 20000) {
                this.sendHeartbeat();
            }
        }, 20000);
    }

    static async sendHeartbeat() {
        try {
            const token = await this.getAuthToken();
            const port = await this.getServerPort();
            await fetch(`http://127.0.0.1:${port}/cgi-bin/exec`, {
                method: 'POST',
                headers: {
                    'X-Ash-Token': token,
                    'Content-Type': 'text/plain'
                },
                body: 'date'
            });
        } catch (error) {
            console.debug('Heartbeat failed:', error.message);
        }
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
        const cleanCommand = command;
        console.log("Sending command to exec:", cleanCommand);
        
        const isSafe = Config.safeCommands.some(regex => regex.test(cleanCommand));
        if (!isSafe) {
            console.log("Command rejected by safe check:", cleanCommand);
            return Promise.reject(new Error(`Unsafe command: ${cleanCommand}`));
        }
        
        this.lastActivityTime = Date.now();
        
        if (typeof ksu !== 'undefined' && typeof ksu.exec === 'function') {
            return new Promise((resolve, reject) => {
                const callbackName = `exec_callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                window[callbackName] = (errno, stdout, stderr) => {
                    delete window[callbackName];
                    if (errno !== 0) {
                        reject(new Error(stderr || `Error ${errno}`));
                    } else {
                        resolve(stdout);
                    }
                };
                ksu.exec(cleanCommand, "{}", callbackName);
            });
        } else {
            return new Promise(async (resolve, reject) => {
                try {
                    const port = await this.getServerPort();
                    const token = await this.getAuthToken();
                    
                    console.log("Sending fetch to port:", port);
                    
                    const response = await fetch(`http://127.0.0.1:${port}/cgi-bin/exec`, {
                        method: 'POST',
                        headers: {
                            'X-Ash-Token': token,
                            'Content-Type': 'text/plain'
                        },
                        body: cleanCommand
                    });
                    
                    if (!response.ok) {
                        if (response.status === 403) {
                            throw new Error("Security Error: Invalid token");
                        }
                        if (response.status === 0 || !response.status) {
                            this.handleServerShutdown();
                            throw new Error("Server connection lost");
                        }
                        throw new Error(`HTTP error: ${response.status}`);
                    }
                    
                    const responseText = await response.text();
                    console.log("Raw response:", responseText);
                    
                    let data;
                    try {
                        data = JSON.parse(responseText);
                    } catch (e) {
                        console.error("JSON parse error:", e, "Response:", responseText);
                        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
                    }
                    
                    if (data.code !== 0) {
                        const cleanError = (data.stdout || "Command failed").replace(/\\n/g, '\n');
                        reject(new Error(cleanError));
                    } else {
                        const cleanOutput = (data.stdout || "").replace(/\\n/g, '\n');
                        resolve(cleanOutput);
                    }
                } catch (error) {
                    console.error("ksuExec error:", error);
                    if (error.message.includes('Failed to fetch') || 
                        error.message.includes('NetworkError') || 
                        error.message.includes('connection lost')) {
                        this.handleServerShutdown();
                    }
                    reject(error);
                }
            });
        }
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
        
        const iconName = type === 'success' ? 'check-circle' : 
                         type === 'error' ? 'exclamation-circle' : 
                         type === 'warning' ? 'exclamation-triangle' : 'info-circle';
        
        const iconHtml = window.icon ? window.icon(iconName) : '';

        toast.innerHTML = `${iconHtml}<span>${message}</span>`;
        
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

    static showLoadingSpinner(show) {
        let spinner = document.querySelector('.loading-spinner');
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            spinner.innerHTML = '<div class="spinner"></div>';
            const container = document.querySelector('.terminal-container');
            if (container) container.appendChild(spinner);
        }
        if (spinner) spinner.style.display = show ? 'flex' : 'none';
    }

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
                this.updateConsole(`Failed to copy logs`, 'error');
            }
            document.body.removeChild(textarea);
        }
    }

    static async displayServerInfo() {
        if (typeof ksu !== 'undefined' && typeof ksu.exec === 'function') return;
        try {
            const port = await this.getServerPort();
            const infoLine = document.createElement('div');
            infoLine.className = 'terminal-line info';
            infoLine.style.borderLeft = '3px solid var(--accent)';
            infoLine.style.paddingLeft = '10px';
            infoLine.innerHTML = `Port: ${port}`;
            const terminalOutput = document.getElementById('terminalOutput');
            if (terminalOutput && terminalOutput.children.length > 0) {
                terminalOutput.insertBefore(infoLine, terminalOutput.children[0]);
            }
        } catch (error) {
            console.debug("Server info not available");
        }
    }

    static removeModal(overlay) {
        overlay.style.animation = 'fadeOut 0.3s ease-out forwards';
        if(overlay.firstChild) {
            overlay.firstChild.style.animation = 'scaleOut 0.3s ease-out forwards';
        }
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
    }

    static stopActivityTracking() {
        if (this.activityTracker) {
            clearInterval(this.activityTracker);
            this.activityTracker = null;
        }
    }
}

window.addEventListener('beforeunload', () => {
    Utils.stopActivityTracking();
});