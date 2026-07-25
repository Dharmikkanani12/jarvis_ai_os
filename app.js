/* ===== JARVIS AI-OS JavaScript ===== */

class JarvisOS {
    constructor() {
        this.windows = {};
        this.windowCount = 0;
        this.activeWindow = null;
        this.zIndex = 200;
        this.socket = null;
        this.currentPath = '';
        this.currentNote = null;
        this.calcExpression = '';
        this.terminalHistory = [];
        this.emailFolder = 'inbox';

        this.init();
    }

    init() {
        this.setupBootSequence();
        this.setupEventListeners();
        this.startClock();
        this.connectWebSocket();
    }

    // ===== Boot Sequence =====
    setupBootSequence() {
        const boot = document.getElementById('boot-screen');
        const lock = document.getElementById('lock-screen');
        const desktop = document.getElementById('desktop');

        setTimeout(() => {
            boot.style.opacity = '0';
            boot.style.transition = 'opacity 0.8s';
            setTimeout(() => {
                boot.classList.add('hidden');
                lock.classList.remove('hidden');
            }, 800);
        }, 3500);

        document.getElementById('unlock-btn').addEventListener('click', () => {
            const pw = document.getElementById('lock-password').value;
            if (pw === 'jarvis') {
                lock.style.opacity = '0';
                lock.style.transition = 'opacity 0.5s';
                setTimeout(() => {
                    lock.classList.add('hidden');
                    desktop.classList.remove('hidden');
                    this.showToast('Welcome back, Administrator', 'success');
                }, 500);
            } else {
                this.showToast('Incorrect password', 'error');
            }
        });

        document.getElementById('lock-password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('unlock-btn').click();
        });
    }

    // ===== Event Listeners =====
    setupEventListeners() {
        // Desktop icons
        document.querySelectorAll('.desktop-icon, .dock-item[data-app]').forEach(icon => {
            icon.addEventListener('click', () => {
                const app = icon.dataset.app;
                if (app) this.openApp(app);
            });
        });

        // Lock button
        document.querySelector('.lock-btn').addEventListener('click', () => {
            location.reload();
        });

        // Context menu
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.window')) return;
            e.preventDefault();
            this.showContextMenu(e.clientX, e.clientY);
        });

        document.addEventListener('click', () => {
            document.getElementById('context-menu').classList.add('hidden');
        });

        document.querySelectorAll('.ctx-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = item.dataset.action;
                if (action === 'new-folder') this.openApp('files');
                if (action === 'new-file') this.openApp('files');
                if (action === 'settings') this.openApp('settings');
            });
        });
    }

    // ===== WebSocket =====
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        try {
            this.socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
            this.socket.onopen = () => console.log('[JARVIS] WebSocket connected');
            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'chat_response') {
                    this.addAIMessage(data.data.response, 'jarvis');
                }
            };
        } catch(e) {
            console.log('[JARVIS] WebSocket unavailable, using HTTP fallback');
        }
    }

    // ===== Window Management =====
    openApp(appType) {
        const id = `win-${appType}-${Date.now()}`;
        const config = this.getAppConfig(appType);

        const win = document.createElement('div');
        win.className = 'window';
        win.id = id;
        win.style.width = config.width || '700px';
        win.style.height = config.height || '500px';
        win.style.left = `${100 + (this.windowCount * 30)}px`;
        win.style.top = `${60 + (this.windowCount * 30)}px`;
        win.style.zIndex = ++this.zIndex;

        win.innerHTML = `
            <div class="window-header" data-win="${id}">
                <div class="window-title">
                    <i class="${config.icon}"></i>
                    <span>${config.title}</span>
                </div>
                <div class="window-controls">
                    <button class="window-btn btn-minimize" data-action="minimize" data-win="${id}"></button>
                    <button class="window-btn btn-maximize" data-action="maximize" data-win="${id}"></button>
                    <button class="window-btn btn-close" data-action="close" data-win="${id}"></button>
                </div>
            </div>
            <div class="window-body" id="body-${id}">
                ${config.content}
            </div>
        `;

        document.getElementById('windows-container').appendChild(win);
        this.windows[id] = { element: win, type: appType, minimized: false };
        this.windowCount++;

        // Setup window controls
        win.querySelectorAll('.window-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleWindowAction(btn.dataset.action, btn.dataset.win);
            });
        });

        // Setup dragging
        this.setupDragging(win);

        // Focus on click
        win.addEventListener('mousedown', () => this.focusWindow(id));

        // Initialize app
        this.initApp(appType, id);

        // Update dock indicator
        document.querySelector(`.dock-item[data-app="${appType}"]`)?.classList.add('active');
    }

    handleWindowAction(action, winId) {
        const win = this.windows[winId];
        if (!win) return;

        if (action === 'close') {
            win.element.remove();
            delete this.windows[winId];
            // Remove dock indicator if no more windows of this type
            const appType = win.type;
            const hasMore = Object.values(this.windows).some(w => w.type === appType);
            if (!hasMore) {
                document.querySelector(`.dock-item[data-app="${appType}"]`)?.classList.remove('active');
            }
        } else if (action === 'minimize') {
            win.element.classList.add('minimized');
            win.minimized = true;
        } else if (action === 'maximize') {
            win.element.classList.toggle('maximized');
        }
    }

    setupDragging(win) {
        const header = win.querySelector('.window-header');
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('window-btn')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = win.offsetLeft;
            startTop = win.offsetTop;
            win.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            win.style.left = `${startLeft + e.clientX - startX}px`;
            win.style.top = `${startTop + e.clientY - startY}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            win.style.transition = '';
        });
    }

    focusWindow(id) {
        const win = this.windows[id];
        if (win) {
            win.element.style.zIndex = ++this.zIndex;
            this.activeWindow = id;
        }
    }

    getAppConfig(type) {
        const configs = {
            ai: { title: 'JARVIS AI Assistant', icon: 'fas fa-brain', width: '500px', height: '600px',
                  content: `<div class="ai-chat-container">
                    <div class="ai-messages" id="ai-messages"></div>
                    <div class="ai-input-area">
                        <input type="text" id="ai-input" placeholder="Ask JARVIS anything...">
                        <button id="ai-send"><i class="fas fa-paper-plane"></i></button>
                    </div>
                  </div>` },
            files: { title: 'File Manager', icon: 'fas fa-folder', width: '800px', height: '550px',
                     content: `<div class="file-manager">
                        <div class="file-toolbar">
                            <button onclick="os.goUp()"><i class="fas fa-arrow-up"></i> Up</button>
                            <button onclick="os.newFolder()"><i class="fas fa-folder-plus"></i> New Folder</button>
                            <button onclick="os.newFile()"><i class="fas fa-file-plus"></i> New File</button>
                            <button onclick="os.refreshFiles()"><i class="fas fa-sync"></i> Refresh</button>
                        </div>
                        <div class="file-path" id="file-path">/</div>
                        <div class="file-grid" id="file-grid"></div>
                     </div>` },
            notes: { title: 'Notes', icon: 'fas fa-sticky-note', width: '700px', height: '500px',
                    content: `<div class="notes-app">
                        <div class="notes-sidebar">
                            <button class="file-toolbar" style="width:100%;margin-bottom:8px;" onclick="os.newNote()">
                                <i class="fas fa-plus"></i> New Note
                            </button>
                            <div id="notes-list" style="overflow-y:auto;flex:1;"></div>
                        </div>
                        <div class="note-editor">
                            <input type="text" id="note-title" placeholder="Note title...">
                            <textarea id="note-content" placeholder="Start writing..."></textarea>
                            <div class="file-toolbar" style="justify-content:flex-end;">
                                <button onclick="os.saveNote()"><i class="fas fa-save"></i> Save</button>
                                <button onclick="os.deleteNote()" style="color:var(--danger)"><i class="fas fa-trash"></i> Delete</button>
                            </div>
                        </div>
                    </div>` },
            terminal: { title: 'Terminal', icon: 'fas fa-terminal', width: '700px', height: '450px',
                       content: `<div class="terminal" id="terminal"></div>` },
            calculator: { title: 'Calculator', icon: 'fas fa-calculator', width: '320px', height: '480px',
                         content: `<div class="calculator">
                            <div class="calc-display" id="calc-display">0</div>
                            <div class="calc-buttons">
                                <button class="calc-btn" onclick="os.calcClear()">C</button>
                                <button class="calc-btn" onclick="os.calcInput('/')">/</button>
                                <button class="calc-btn" onclick="os.calcInput('*')">×</button>
                                <button class="calc-btn" onclick="os.calcBack()">←</button>
                                <button class="calc-btn" onclick="os.calcInput('7')">7</button>
                                <button class="calc-btn" onclick="os.calcInput('8')">8</button>
                                <button class="calc-btn" onclick="os.calcInput('9')">9</button>
                                <button class="calc-btn operator" onclick="os.calcInput('-')">-</button>
                                <button class="calc-btn" onclick="os.calcInput('4')">4</button>
                                <button class="calc-btn" onclick="os.calcInput('5')">5</button>
                                <button class="calc-btn" onclick="os.calcInput('6')">6</button>
                                <button class="calc-btn operator" onclick="os.calcInput('+')">+</button>
                                <button class="calc-btn" onclick="os.calcInput('1')">1</button>
                                <button class="calc-btn" onclick="os.calcInput('2')">2</button>
                                <button class="calc-btn" onclick="os.calcInput('3')">3</button>
                                <button class="calc-btn equals" onclick="os.calcEquals()">=</button>
                                <button class="calc-btn" style="grid-column:span 2;" onclick="os.calcInput('0')">0</button>
                                <button class="calc-btn" onclick="os.calcInput('.')">.</button>
                            </div>
                         </div>` },
            browser: { title: 'Browser', icon: 'fas fa-globe', width: '900px', height: '600px',
                      content: `<div class="browser">
                        <div class="browser-bar">
                            <button onclick="os.browserBack()"><i class="fas fa-arrow-left"></i></button>
                            <input type="text" id="browser-url" placeholder="Enter URL or search..." onkeypress="if(event.key==='Enter')os.browserGo()">
                            <button onclick="os.browserGo()">Go</button>
                            <button onclick="os.browserBookmark()"><i class="fas fa-star"></i></button>
                        </div>
                        <div class="browser-content" id="browser-content">
                            <div style="text-align:center;padding:40px;color:var(--text-secondary);">
                                <i class="fas fa-globe" style="font-size:48px;margin-bottom:16px;"></i>
                                <p>Enter a URL to browse or search your cached pages</p>
                            </div>
                        </div>
                      </div>` },
            email: { title: 'Mail', icon: 'fas fa-envelope', width: '900px', height: '600px',
                    content: `<div class="email-app">
                        <div class="email-sidebar">
                            <button class="file-toolbar" style="width:100%;margin-bottom:8px;" onclick="os.composeEmail()">
                                <i class="fas fa-pen"></i> Compose
                            </button>
                            <div class="email-folder active" onclick="os.loadEmails('inbox')">
                                <i class="fas fa-inbox"></i> Inbox
                            </div>
                            <div class="email-folder" onclick="os.loadEmails('sent')">
                                <i class="fas fa-paper-plane"></i> Sent
                            </div>
                            <div class="email-folder" onclick="os.loadEmails('drafts')">
                                <i class="fas fa-file"></i> Drafts
                            </div>
                            <div class="email-folder" onclick="os.showContacts()">
                                <i class="fas fa-address-book"></i> Contacts
                            </div>
                        </div>
                        <div class="email-list" id="email-list"></div>
                    </div>` },
            security: { title: 'Security Center', icon: 'fas fa-shield-alt', width: '700px', height: '550px',
                       content: `<div class="security-dashboard">
                            <div class="sec-header">
                                <i class="fas fa-shield-alt"></i>
                                <div>
                                    <div class="sec-status-text">System Secure</div>
                                    <div class="sec-status-sub">All protection modules active</div>
                                </div>
                            </div>
                            <div class="sec-grid">
                                <div class="sec-card">
                                    <h4>CPU Usage</h4>
                                    <div class="value" id="sec-cpu">--%</div>
                                </div>
                                <div class="sec-card">
                                    <h4>Memory</h4>
                                    <div class="value" id="sec-mem">--%</div>
                                </div>
                                <div class="sec-card">
                                    <h4>Threats Blocked</h4>
                                    <div class="value" id="sec-threats">0</div>
                                </div>
                                <div class="sec-card">
                                    <h4>Active Processes</h4>
                                    <div class="value" id="sec-proc">--</div>
                                </div>
                            </div>
                            <div style="margin-bottom:12px;font-size:14px;font-weight:600;">Recent Activity</div>
                            <div class="sec-log" id="sec-log">Scanning system...</div>
                            <div style="margin-top:12px;display:flex;gap:8px;">
                                <button class="file-toolbar" onclick="os.runSecurityScan()">
                                    <i class="fas fa-search"></i> Full Scan
                                </button>
                                <button class="file-toolbar" onclick="os.showFirewall()">
                                    <i class="fas fa-fire"></i> Firewall Rules
                                </button>
                            </div>
                       </div>` },
            settings: { title: 'Settings', icon: 'fas fa-cog', width: '500px', height: '450px',
                       content: `<div class="settings-panel">
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Dark Mode</div>
                                    <div class="setting-desc">Always enabled in JARVIS OS</div>
                                </div>
                                <span style="color:var(--success)"><i class="fas fa-check-circle"></i></span>
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">AI Offline Mode</div>
                                    <div class="setting-desc">Run AI entirely on local hardware</div>
                                </div>
                                <span style="color:var(--success)"><i class="fas fa-check-circle"></i></span>
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Security Monitoring</div>
                                    <div class="setting-desc">Real-time threat detection</div>
                                </div>
                                <span style="color:var(--success)"><i class="fas fa-check-circle"></i></span>
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Auto-save Notes</div>
                                    <div class="setting-desc">Save notes automatically</div>
                                </div>
                                <span style="color:var(--success)"><i class="fas fa-check-circle"></i></span>
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Version</div>
                                    <div class="setting-desc">JARVIS AI-OS v1.0.0</div>
                                </div>
                                <span style="color:var(--text-secondary)">Build 2026.07</span>
                            </div>
                       </div>` }
        };
        return configs[type] || { title: 'App', icon: 'fas fa-cube', content: '<div>App content</div>' };
    }

    // ===== App Initializers =====
    initApp(type, winId) {
        switch(type) {
            case 'ai': this.initAI(winId); break;
            case 'files': this.initFiles(winId); break;
            case 'terminal': this.initTerminal(winId); break;
            case 'notes': this.initNotes(winId); break;
            case 'security': this.initSecurity(winId); break;
            case 'email': this.initEmail(winId); break;
            case 'browser': this.initBrowser(winId); break;
        }
    }

    // ===== AI Chat =====
    initAI(winId) {
        const input = document.getElementById('ai-input');
        const sendBtn = document.getElementById('ai-send');

        const sendMessage = async () => {
            const msg = input.value.trim();
            if (!msg) return;
            input.value = '';
            this.addAIMessage(msg, 'user');

            try {
                if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                    this.socket.send(JSON.stringify({type: 'chat', message: msg}));
                } else {
                    const res = await fetch('/api/ai/chat', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({message: msg})
                    });
                    const data = await res.json();
                    this.addAIMessage(data.response, 'jarvis');
                }
            } catch(e) {
                this.addAIMessage('I apologize, but I am experiencing a temporary system delay. Please try again.', 'jarvis');
            }
        };

        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

        // Welcome message
        setTimeout(() => {
            this.addAIMessage('Hello, sir. JARVIS online and fully operational. All systems are running at optimal capacity. How may I assist you today?', 'jarvis');
        }, 500);
    }

    addAIMessage(text, sender) {
        const container = document.getElementById('ai-messages');
        if (!container) return;
        const div = document.createElement('div');
        div.className = `ai-message ${sender}`;
        div.innerHTML = `<div class="msg-header">${sender === 'jarvis' ? 'JARVIS' : 'You'}</div>${this.escapeHtml(text)}`;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    // ===== File Manager =====
    initFiles(winId) {
        this.loadFiles('');
    }

    async loadFiles(path) {
        this.currentPath = path;
        document.getElementById('file-path').textContent = '/' + path;
        try {
            const res = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`);
            const data = await res.json();
            const grid = document.getElementById('file-grid');
            grid.innerHTML = '';

            if (data.error) {
                grid.innerHTML = `<div style="color:var(--danger);padding:20px;">${data.error}</div>`;
                return;
            }

            data.items.forEach(item => {
                const div = document.createElement('div');
                div.className = `file-item ${item.type}`;
                const icon = item.type === 'directory' ? 'fa-folder' : 'fa-file';
                div.innerHTML = `<i class="fas ${icon}"></i><span>${this.escapeHtml(item.name)}</span>`;
                div.addEventListener('dblclick', () => {
                    if (item.type === 'directory') {
                        this.loadFiles(item.path);
                    } else {
                        this.openFile(item.path);
                    }
                });
                grid.appendChild(div);
            });
        } catch(e) {
            this.showToast('Failed to load files', 'error');
        }
    }

    goUp() {
        const parent = this.currentPath.includes('/') ? this.currentPath.substring(0, this.currentPath.lastIndexOf('/')) : '';
        this.loadFiles(parent);
    }

    async newFolder() {
        const name = prompt('Folder name:');
        if (!name) return;
        const path = this.currentPath ? `${this.currentPath}/${name}` : name;
        await fetch('/api/files/create-folder', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({path})
        });
        this.loadFiles(this.currentPath);
    }

    async newFile() {
        const name = prompt('File name:');
        if (!name) return;
        const path = this.currentPath ? `${this.currentPath}/${name}` : name;
        await fetch('/api/files/create-file', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({path, content: ''})
        });
        this.loadFiles(this.currentPath);
    }

    async openFile(path) {
        try {
            const res = await fetch(`/api/files/read?path=${encodeURIComponent(path)}`);
            const data = await res.json();
            if (data.content !== undefined) {
                const content = prompt('File content:', data.content);
                if (content !== null) {
                    await fetch('/api/files/write', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({path, content})
                    });
                }
            }
        } catch(e) {}
    }

    refreshFiles() { this.loadFiles(this.currentPath); }

    // ===== Terminal =====
    initTerminal(winId) {
        const term = document.getElementById('terminal');
        term.innerHTML = `<div class="terminal-line">JARVIS OS Terminal v1.0.0</div>
                          <div class="terminal-line">Type 'help' for available commands</div>`;
        this.terminalPrompt(term);
    }

    terminalPrompt(term) {
        const line = document.createElement('div');
        line.className = 'terminal-input-line';
        line.innerHTML = `<span class="terminal-prompt">user@jarvis-os:~$</span>
                          <input type="text" spellcheck="false" autofocus>`;
        term.appendChild(line);
        const input = line.querySelector('input');
        input.focus();

        input.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const cmd = input.value.trim();
                input.disabled = true;
                await this.executeCommand(cmd, term);
                this.terminalPrompt(term);
            }
        });

        term.scrollTop = term.scrollHeight;
    }

    async executeCommand(cmd, term) {
        const output = document.createElement('div');
        output.className = 'terminal-line';

        if (!cmd) return;

        if (cmd === 'help') {
            output.innerHTML = `Available commands:<br>
                help - Show this help<br>
                clear - Clear terminal<br>
                sysinfo - System information<br>
                ls - List files<br>
                ai [message] - Talk to JARVIS<br>
                scan - Run security scan<br>
                time - Show current time`;
        } else if (cmd === 'clear') {
            term.innerHTML = '';
            return;
        } else if (cmd === 'sysinfo') {
            try {
                const res = await fetch('/api/system/status');
                const data = await res.json();
                output.innerHTML = `CPU: ${data.cpu}%<br>Memory: ${(data.memory.used/1024/1024/1024).toFixed(2)}GB / ${(data.memory.total/1024/1024/1024).toFixed(2)}GB<br>Processes: ${data.processes}`;
            } catch(e) {
                output.textContent = 'Error fetching system info';
            }
        } else if (cmd === 'ls') {
            output.textContent = 'Use the File Manager app for better navigation.';
        } else if (cmd.startsWith('ai ')) {
            const msg = cmd.slice(3);
            try {
                const res = await fetch('/api/ai/chat', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({message: msg})
                });
                const data = await res.json();
                output.innerHTML = `<span style="color:var(--accent)">JARVIS:</span> ${this.escapeHtml(data.response)}`;
            } catch(e) {
                output.textContent = 'JARVIS is offline';
            }
        } else if (cmd === 'scan') {
            output.textContent = 'Initiating security scan...';
            try {
                const res = await fetch('/api/security/scan');
                const data = await res.json();
                output.innerHTML = `Scan complete. Status: ${data.status}<br>Findings: ${data.findings.length}`;
            } catch(e) {}
        } else if (cmd === 'time') {
            output.textContent = new Date().toLocaleString();
        } else {
            output.textContent = `Command not found: ${cmd}`;
        }

        term.appendChild(output);
        term.scrollTop = term.scrollHeight;
    }

    // ===== Calculator =====
    calcInput(val) {
        if (this.calcExpression === '0' && val !== '.') this.calcExpression = '';
        this.calcExpression += val;
        document.getElementById('calc-display').textContent = this.calcExpression;
    }

    calcClear() {
        this.calcExpression = '';
        document.getElementById('calc-display').textContent = '0';
    }

    calcBack() {
        this.calcExpression = this.calcExpression.slice(0, -1);
        document.getElementById('calc-display').textContent = this.calcExpression || '0';
    }

    calcEquals() {
        try {
            const result = eval(this.calcExpression.replace('×', '*'));
            this.calcExpression = String(result);
            document.getElementById('calc-display').textContent = result;
        } catch {
            document.getElementById('calc-display').textContent = 'Error';
            this.calcExpression = '';
        }
    }

    // ===== Notes =====
    initNotes(winId) { this.loadNotesList(); }

    async loadNotesList() {
        try {
            const res = await fetch('/api/notes');
            const data = await res.json();
            const list = document.getElementById('notes-list');
            list.innerHTML = '';
            data.notes.forEach(note => {
                const div = document.createElement('div');
                div.className = 'note-list-item' + (this.currentNote === note.id ? ' active' : '');
                div.innerHTML = `<div class="note-list-title">${this.escapeHtml(note.title)}</div>
                                 <div class="note-list-date">${new Date(note.updated).toLocaleDateString()}</div>`;
                div.addEventListener('click', () => this.loadNote(note));
                list.appendChild(div);
            });
        } catch(e) {}
    }

    loadNote(note) {
        this.currentNote = note.id;
        document.getElementById('note-title').value = note.title;
        document.getElementById('note-content').value = note.content;
        this.loadNotesList();
    }

    async saveNote() {
        const title = document.getElementById('note-title').value || 'Untitled';
        const content = document.getElementById('note-content').value;
        await fetch('/api/notes', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id: this.currentNote, title, content})
        });
        this.showToast('Note saved', 'success');
        this.loadNotesList();
    }

    newNote() {
        this.currentNote = null;
        document.getElementById('note-title').value = '';
        document.getElementById('note-content').value = '';
        this.loadNotesList();
    }

    async deleteNote() {
        if (!this.currentNote) return;
        await fetch(`/api/notes/${this.currentNote}`, {method: 'DELETE'});
        this.currentNote = null;
        document.getElementById('note-title').value = '';
        document.getElementById('note-content').value = '';
        this.loadNotesList();
    }

    // ===== Browser =====
    initBrowser(winId) {}

    async browserGo() {
        const url = document.getElementById('browser-url').value;
        if (!url) return;
        const content = document.getElementById('browser-content');
        content.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:32px;color:var(--accent)"></i><p>Loading...</p></div>';

        try {
            const res = await fetch('/api/browser/fetch', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({url})
            });
            const data = await res.json();
            if (data.error) {
                content.innerHTML = `<div style="color:var(--danger);padding:20px;">Error: ${data.error}</div>`;
            } else {
                content.innerHTML = `<h2 style="margin-bottom:16px;color:var(--accent)">${this.escapeHtml(data.title)}</h2>
                                     <div style="font-size:13px;line-height:1.8;">${this.escapeHtml(data.text).replace(/\n/g, '<br>')}</div>`;
            }
        } catch(e) {
            content.innerHTML = '<div style="color:var(--danger)">Failed to load page</div>';
        }
    }

    browserBack() { document.getElementById('browser-content').innerHTML = ''; }
    async browserBookmark() {
        const url = document.getElementById('browser-url').value;
        if (!url) return;
        await fetch('/api/browser/bookmark', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({url, title: url})
        });
        this.showToast('Bookmark added', 'success');
    }

    // ===== Email =====
    initEmail(winId) { this.loadEmails('inbox'); }

    async loadEmails(folder) {
        this.emailFolder = folder;
        document.querySelectorAll('.email-folder').forEach(f => f.classList.remove('active'));
        event?.target?.classList.add('active');

        try {
            const res = await fetch(`/api/email/inbox?folder=${folder}`);
            const data = await res.json();
            const list = document.getElementById('email-list');
            list.innerHTML = '';

            data.emails.forEach(email => {
                const div = document.createElement('div');
                div.className = 'email-item' + (email.read ? '' : ' unread');
                div.innerHTML = `
                    <div class="email-item-header">
                        <span class="email-from">${this.escapeHtml(email.from)}</span>
                        <span class="email-time">${new Date(email.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div class="email-subject">${this.escapeHtml(email.subject)}</div>
                `;
                div.addEventListener('click', () => this.readEmail(email));
                list.appendChild(div);
            });
        } catch(e) {}
    }

    readEmail(email) {
        const list = document.getElementById('email-list');
        list.innerHTML = `
            <div style="padding:16px;">
                <button class="file-toolbar" onclick="os.loadEmails('${this.emailFolder}')" style="margin-bottom:16px;">
                    <i class="fas fa-arrow-left"></i> Back
                </button>
                <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border);">
                    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">From: ${this.escapeHtml(email.from)}</div>
                    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">To: ${this.escapeHtml(email.to)}</div>
                    <div style="font-size:18px;font-weight:600;">${this.escapeHtml(email.subject)}</div>
                    <div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">${new Date(email.timestamp).toLocaleString()}</div>
                </div>
                <div style="font-size:13px;line-height:1.6;white-space:pre-wrap;">${this.escapeHtml(email.body)}</div>
            </div>
        `;
    }

    composeEmail() {
        const list = document.getElementById('email-list');
        list.innerHTML = `
            <div style="padding:16px;">
                <div style="margin-bottom:12px;">
                    <input type="text" id="compose-to" placeholder="To:" style="width:100%;padding:8px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);margin-bottom:8px;">
                    <input type="text" id="compose-subject" placeholder="Subject:" style="width:100%;padding:8px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);margin-bottom:8px;">
                    <textarea id="compose-body" placeholder="Message..." style="width:100%;height:200px;padding:8px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);resize:none;"></textarea>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="file-toolbar" onclick="os.sendEmail()">Send</button>
                    <button class="file-toolbar" onclick="os.saveDraft()">Save Draft</button>
                </div>
            </div>
        `;
    }

    async sendEmail() {
        const to = document.getElementById('compose-to').value;
        const subject = document.getElementById('compose-subject').value;
        const body = document.getElementById('compose-body').value;
        await fetch('/api/email/compose', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({to, subject, body, draft: false})
        });
        this.showToast('Email sent', 'success');
        this.loadEmails('sent');
    }

    async saveDraft() {
        const to = document.getElementById('compose-to').value;
        const subject = document.getElementById('compose-subject').value;
        const body = document.getElementById('compose-body').value;
        await fetch('/api/email/compose', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({to, subject, body, draft: true})
        });
        this.showToast('Draft saved', 'success');
    }

    showContacts() {
        document.getElementById('email-list').innerHTML = '<div style="padding:20px;color:var(--text-secondary)">Contacts feature coming soon</div>';
    }

    // ===== Security Dashboard =====
    initSecurity(winId) {
        this.runSecurityScan();
        setInterval(() => this.updateSecurityStatus(), 5000);
    }

    async runSecurityScan() {
        try {
            const res = await fetch('/api/security/scan');
            const data = await res.json();
            document.getElementById('sec-threats').textContent = data.findings ? data.findings.length : 0;
            
            const log = document.getElementById('sec-log');
            log.innerHTML = data.findings.length > 0 
                ? data.findings.map(f => `<div class="sec-log-entry">[${new Date().toLocaleTimeString()}] ${f.type}</div>`).join('')
                : '<div class="sec-log-entry">System scan complete. All systems nominal.</div>';
        } catch(e) {}
    }

    async updateSecurityStatus() {
        try {
            const res = await fetch('/api/system/status');
            const data = await res.json();
            document.getElementById('sec-cpu').textContent = Math.round(data.cpu) + '%';
            const memPercent = Math.round((data.memory.used / data.memory.total) * 100);
            document.getElementById('sec-mem').textContent = memPercent + '%';
            document.getElementById('sec-proc').textContent = data.processes;
        } catch(e) {}
    }

    showFirewall() {
        const content = document.querySelector('.security-dashboard');
        fetch('/api/security/firewall')
            .then(r => r.json())
            .then(data => {
                let html = '<div style="margin-top:12px;"><h4 style="margin-bottom:8px;">Firewall Rules</h4>';
                data.rules.forEach(rule => {
                    const statusColor = rule.status === 'open' ? 'var(--danger)' : 'var(--success)';
                    html += `<div style="padding:8px;border-bottom:1px solid var(--border);font-size:12px;">
                        <span style="color:${statusColor}">${rule.port}</span> - ${rule.service} (${rule.status})
                    </div>`;
                });
                html += '</div>';
                const fwDiv = document.querySelector('.security-dashboard');
                fwDiv.innerHTML += html;
            })
            .catch(e => console.error(e));
    }

    // ===== Utility Methods =====
    showToast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = {success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle'};
        toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    }

    showContextMenu(x, y) {
        const menu = document.getElementById('context-menu') || this.createContextMenu();
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.classList.remove('hidden');
    }

    createContextMenu() {
        const menu = document.createElement('div');
        menu.id = 'context-menu';
        menu.className = 'hidden';
        menu.innerHTML = `
            <div class="ctx-item" data-action="new-folder">
                <i class="fas fa-folder-plus"></i> New Folder
            </div>
            <div class="ctx-item" data-action="new-file">
                <i class="fas fa-file-plus"></i> New File
            </div>
            <div class="ctx-separator"></div>
            <div class="ctx-item" data-action="settings">
                <i class="fas fa-cog"></i> Settings
            </div>
        `;
        document.body.appendChild(menu);
        return menu;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    startClock() {
        const updateClock = () => {
            const now = new Date();
            const timeEl = document.getElementById('lock-time');
            const dateEl = document.getElementById('lock-date');
            if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'});
            if (dateEl) {
                const options = {weekday: 'long', month: 'long', day: 'numeric'};
                dateEl.textContent = now.toLocaleDateString('en-US', options);
            }
        };
        updateClock();
        setInterval(updateClock, 1000);
    }
}

// Initialize JARVIS OS when page loads
let os;
document.addEventListener('DOMContentLoaded', () => {
    os = new JarvisOS();
    console.log('[JARVIS] Operating system initialized');
});

    // ===== Security =====
    initSecurity(winId) {
        this.updateSecurityStats();
        setInterval(() => this.updateSecurityStats(), 5000);
    }

    async updateSecurityStats() {
        try {
            const res = await fetch('/api/system/status');
            const data = await res.json();
            document.getElementById('sec-cpu').textContent = data.cpu + '%';
            document.getElementById('sec-mem').textContent = Math.round(data.memory.percent) + '%';
            document.getElementById('sec-proc').textContent = data.processes;
        } catch(e) {}
    }

    async runSecurityScan() {
        const log = document.getElementById('sec-log');
        log.innerHTML = '<div class="sec-log-entry">Initiating deep scan...</div>';
        try {
            const res = await fetch('/api/security/scan');
            const data = await res.json();
            log.innerHTML = `<div class="sec-log-entry">[${new Date().toLocaleTimeString()}] Scan complete. Status: ${data.status}</div>
                             <div class="sec-log-entry">Network connections checked: ${data.network_connections?.length || 0}</div>
                             <div class="sec-log-entry">File integrity: ${data.file_integrity?.length || 0} changes detected</div>`;
            document.getElementById('sec-threats').textContent = data.findings?.length || 0;
        } catch(e) {
            log.innerHTML += '<div class="sec-log-entry">Scan failed</div>';
        }
    }

    async showFirewall() {
        const log = document.getElementById('sec-log');
        try {
            const res = await fetch('/api/security/firewall');
            const data = await res.json();
            log.innerHTML = data.rules.map(r => 
                `<div class="sec-log-entry">Port ${r.port} (${r.service}): ${r.status} ${r.trusted ? '[TRUSTED]' : '[FILTERED]'}</div>`
            ).join('');
        } catch(e) {}
    }

    // ===== Utilities =====
    startClock() {
        const update = () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'});
            const dateStr = now.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});
            document.getElementById('top-time').textContent = timeStr;
            document.getElementById('lock-time').textContent = timeStr;
            document.getElementById('lock-date').textContent = dateStr;
        };
        update();
        setInterval(update, 1000);
    }

    showContextMenu(x, y) {
        const menu = document.getElementById('context-menu');
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.classList.remove('hidden');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
        toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize OS
const os = new JarvisOS();
