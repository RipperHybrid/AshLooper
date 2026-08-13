import { Utils } from './utils.js';
import { AshLooperIcons } from './icons.js';

export class FileManager {
    constructor(mainInstance) {
        this.app = mainInstance;
    }
    async loadLogFiles() {
        Utils.showLoadingSpinner(true);
        try {
            const result = await Utils.ksuExec("ls -1 /cache/looper/");
            this.app.logFiles = result.split('\n')
                .filter(file => file.trim() && /^AshReXcueSession-\d+\.log$/i.test(file.trim()))
                .sort();
            this.renderFileList();
        } catch (error) {
            Utils.updateConsole(`Error loading log files: ${error.message}`, 'error');
            this.app.logFiles = [];
            this.renderFileList();
        } finally {
            Utils.showLoadingSpinner(false);
        }
    }
    renderFileList() {
        const fileList = document.getElementById('fileList');
        if (!fileList) return;
        fileList.innerHTML = '';
        if (this.app.logFiles.length === 0) {
            fileList.innerHTML = '<div class="file-item">No log files found</div>';
            return;
        }
        this.app.logFiles.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            let displayName = file;
            if (file.includes('AshReXcueSession-')) {
                const parts = file.split('-');
                if (parts.length >= 2) {
                    displayName = `Session Log ${parts[1].replace('.log', '')}`;
                }
            }
            fileItem.innerHTML = `
                <div class="file-name-display">${displayName}</div>
                <div class="file-path">${file}</div>
            `;
            fileItem.addEventListener('click', () => this.selectFile(file));
            fileList.appendChild(fileItem);
        });
    }
    async selectFile(filename) {
        const prevLogFile = this.app.currentLogFile;
        const prevOriginalLines = [...this.app.originalLines];
        const prevBootSessions = [...this.app.bootSessions];
        const prevSessionIndex = this.app.currentSessionIndex;
        const terminalOutput = document.getElementById('terminalOutput');
        const prevTerminalHTML = terminalOutput ? terminalOutput.innerHTML : '';
        this.app.closePopup();
        Utils.showLoadingSpinner(true);
        try {
            const content = await Utils.ksuExec(`cat /cache/looper/${filename}`);
            this.app.originalLines = content.split('\n');
            this.parseBootSessions();
            if (this.app.bootSessions.length > 1) {
                this.app.showSessionSelector(
                    () => {
                        this.app.currentLogFile = filename;
                        this.app.updateSelectedFile();
                        Utils.updateConsole(`Reading: ${filename}`);
                        this.app.clearSearch();
                        this.app.displayLogContent(this.app.getCurrentSessionLines());
                    },
                    () => {
                        this.app.currentLogFile = prevLogFile;
                        this.app.originalLines = prevOriginalLines;
                        this.app.bootSessions = prevBootSessions;
                        this.app.currentSessionIndex = prevSessionIndex;
                        if (terminalOutput) terminalOutput.innerHTML = prevTerminalHTML;
                        this.app.updateSelectedFile();
                    }
                );
            } else {
                this.app.currentLogFile = filename;
                this.app.currentSessionIndex = 0;
                this.app.updateSelectedFile();
                Utils.updateConsole(`Reading: ${filename}`);
                this.app.clearSearch();
                this.app.displayLogContent(this.app.getCurrentSessionLines());
            }
        } catch (error) {
            Utils.updateConsole(`Error reading file: ${error.message}`, 'error');
            this.app.currentLogFile = filename;
            this.app.originalLines = [`Error reading file: ${error.message}`];
            this.app.updateSelectedFile();
            this.app.displayLogContent(this.app.originalLines);
        } finally {
            Utils.showLoadingSpinner(false);
        }
    }
    async refreshCurrentFile() {
        if (!this.app.currentLogFile) return;
        const filename = this.app.currentLogFile;
        const prevSessionIndex = this.app.currentSessionIndex;
        const terminalOutput = document.getElementById('terminalOutput');
        const isScrolledToBottom = terminalOutput ? (terminalOutput.scrollHeight - terminalOutput.scrollTop <= terminalOutput.clientHeight + 10) : false;
        Utils.showLoadingSpinner(true);
        try {
            const content = await Utils.ksuExec(`cat /cache/looper/${filename}`);
            this.app.originalLines = content.split('\n');
            this.parseBootSessions();
            if (prevSessionIndex !== -1) {
                if (prevSessionIndex < this.app.bootSessions.length) {
                    this.app.currentSessionIndex = prevSessionIndex;
                } else {
                    this.app.currentSessionIndex = this.app.bootSessions.length - 1;
                }
            }
            this.app.updateSelectedFile();
            this.app.displayLogContent(this.app.getCurrentSessionLines());
            if (isScrolledToBottom && terminalOutput) {
                terminalOutput.scrollTop = terminalOutput.scrollHeight;
            }
            Utils.showToast(`Refreshed: ${filename}`, 'success');
        } catch (error) {
            Utils.updateConsole(`Error refreshing file: ${error.message}`, 'error');
             Utils.showToast(`Error refreshing file check terminal`, 'error');
        } finally {
            Utils.showLoadingSpinner(false);
        }
    }
    parseBootSessions() {
        this.app.bootSessions = [];
        let currentSessionLines = [];
        let globalLineCounter = 0;
        let sessionMeta = {
            bootNum: '?',
            rctStatus: 'Unknown',
            date: 'Unknown',
            time: 'Unknown',
            hasEnd: false,
            startLine: 1,
            endLine: 0
        };
        const finalizeSession = (lines, meta, endLineIndex) => {
            if (lines.length > 0) {
                const displayLines = lines.filter(l => l.trim() !== '');
                if (displayLines.length > 0) {
                    meta.endLine = endLineIndex;
                    this.app.bootSessions.push({
                        lines: displayLines,
                        meta: { ...meta }
                    });
                }
            }
        };
        this.app.originalLines.forEach((line, index) => {
            globalLineCounter++;
            if (line.includes('NEW BOOT') && line.includes('◆◆◆')) {
                if (currentSessionLines.length > 0) {
                    finalizeSession(currentSessionLines, sessionMeta, globalLineCounter - 1);
                }
                const bootMatch = line.match(/BOOT (\d+)/);
                const bootNum = bootMatch ? bootMatch[1] : '?';
                currentSessionLines = [line];
                sessionMeta = {
                    bootNum: bootNum,
                    rctStatus: 'Unknown',
                    date: 'Unknown',
                    time: 'Unknown',
                    hasEnd: false,
                    startLine: globalLineCounter,
                    endLine: 0
                };
            } else {
                currentSessionLines.push(line);
                if (line.includes('RTC Status:')) {
                    if (line.includes('CORRECT')) sessionMeta.rctStatus = 'Correct';
                    else sessionMeta.rctStatus = 'Incorrect';
                }
                if (line.includes('Date:')) {
                    const dateStartIndex = line.indexOf('Date:');
                    const pipeIndex = line.indexOf('|', dateStartIndex);
                    if (dateStartIndex !== -1 && pipeIndex !== -1) {
                        const dateContent = line.substring(dateStartIndex + 5, pipeIndex).trim();
                        const parts = dateContent.split(' ');
                        sessionMeta.date = parts[0] || 'Unknown';
                        sessionMeta.time = parts[1] || 'Unknown';
                    }
                }
                if (line.includes('######## THE END ##########')) {
                    sessionMeta.hasEnd = true;
                }
            }
        });
        finalizeSession(currentSessionLines, sessionMeta, globalLineCounter);
        this.app.bootSessions.forEach((session, index) => {
            const isLast = index === this.app.bootSessions.length - 1;
            if (session.meta.hasEnd) {
                session.type = 'Clean';
            } else {
                session.type = isLast ? 'Active' : 'Loop';
            }
        });
    }
    async saveToDownload() {
        if (!this.app.currentLogFile) {
            Utils.showToast('No log file selected');
            return;
        }
        Utils.showLoadingSpinner(true);
        try {
            let destFilename;
            const sourcePath = `/cache/looper/${this.app.currentLogFile}`;
            if (this.app.currentSessionIndex === -1) {
                destFilename = this.app.currentLogFile;
            } else {
                const session = this.app.bootSessions[this.app.currentSessionIndex];
                destFilename = `AshReXcue-Boot${session.meta.bootNum}-${Date.now()}.log`;
            }
            const destPath = `/storage/emulated/0/Download/${destFilename}`;
            if (this.app.currentSessionIndex === -1) {
                await Utils.ksuExec(`cp "${sourcePath}" "${destPath}"`);
            } else {
                const session = this.app.bootSessions[this.app.currentSessionIndex];
                const start = session.meta.startLine;
                const end = session.meta.endLine;
                const tempPath = `/data/local/tmp/${destFilename}`;
                await Utils.ksuExec(`sed -n '${start},${end}p' "${sourcePath}" > "${tempPath}"`);
                await Utils.ksuExec(`cp "${tempPath}" "${destPath}"`);
                await Utils.ksuExec(`rm "${tempPath}"`);
            }
            Utils.updateConsole(`Saved to ${destPath}`, 'success');
            Utils.showToast(`Saved to Downloads`, 'success');
        } catch (error) {
            Utils.updateConsole(`Save failed: ${error.message}`, 'error');
            Utils.showToast(`Save failed`, 'error');
        } finally {
            Utils.showLoadingSpinner(false);
        }
    }
}