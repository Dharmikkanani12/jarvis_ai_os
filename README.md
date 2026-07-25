# JARVIS AI-OS v1.0.0

A fully functional, AI-powered offline operating system built with Python and FastAPI.

## Features

### 🤖 JARVIS AI Assistant
- Offline RAG (Retrieval-Augmented Generation) using sentence-transformers and FAISS
- Natural language command execution
- Persistent knowledge base that learns from interactions
- WebSocket real-time communication

### 📁 File Manager
- Create, read, update, delete files and folders
- Search functionality
- Trash/recovery system
- File integrity checking (SHA256)

### 📧 Email Client
- Compose, send, draft emails
- Inbox/Sent/Drafts folders
- AI-powered email drafting
- Contact management

### 🛡️ Security Center
- Real-time system monitoring
- Network connection scanning
- Process monitoring
- File integrity verification
- Firewall rule management
- Threat logging and alerts

### 🌐 Browser & Research
- Web page fetching and text extraction
- Offline page caching
- Bookmark management
- Search history

### 📝 Notes
- Auto-saving notes
- Rich text editing
- Persistent storage

### 💻 Terminal
- Command-line interface
- System information
- AI chat from terminal
- Security scanning

### 🧮 Calculator
- Full arithmetic operations

### ⚙️ Settings
- System configuration

## Architecture

```
ai-os/
├── main.py              # FastAPI application entry point
├── core/
│   ├── ai_engine.py     # JARVIS AI with RAG
│   ├── file_manager.py  # File operations
│   ├── security.py      # Security monitoring
│   ├── email_client.py  # Email management
│   └── browser.py       # Web research tool
├── static/
│   ├── index.html       # OS desktop interface
│   ├── css/style.css    # Styling
│   └── js/app.js        # Frontend logic
├── data/                # Persistent storage
└── logs/                # Security logs
```

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# The first run will download the sentence-transformer model (~80MB)
# All subsequent runs are fully offline
```

## Usage

```bash
# Start the OS
python main.py

# Open your browser to:
http://localhost:8000

# Default lock screen password: jarvis
```

## System Requirements

- Python 3.8+
- 4GB RAM minimum (8GB recommended for AI features)
- Internet connection required only for:
  - Initial model download
  - Browser web page fetching
- All core AI features run 100% offline

## Security Features

- Background security scanning every 30 seconds
- Network connection monitoring
- File integrity baseline checking
- Activity logging
- Firewall rule visualization

## AI Capabilities

The AI uses:
- **Sentence Transformers** (all-MiniLM-L6-v2) for text embeddings
- **FAISS** for fast similarity search
- **RAG** for context-aware responses
- Expandable knowledge base

## License

MIT License - Built for offline AI operating system research.
