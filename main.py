"""
JARVIS AI-OS Main Application
FastAPI backend for AI-powered offline operating system
"""
import os
import sys
import json
import asyncio
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, WebSocket, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
import uvicorn

# Add core to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.ai_engine import JarvisAI
from core.file_manager import FileManager
from core.security import SecurityMonitor
from core.email_client import EmailClient
from core.browser import Browser

app = FastAPI(title="JARVIS AI-OS", version="1.0.0")

# Initialize systems
jarvis = JarvisAI()
files = FileManager()
security = SecurityMonitor()
email = EmailClient()
browser = Browser()

# Start security monitoring
security.start_monitoring()

# Add default knowledge
if len(jarvis.documents) == 0:
    jarvis.add_knowledge("JARVIS AI-OS is a fully offline-capable operating system with advanced AI features.", "system")
    jarvis.add_knowledge("File Manager supports create, read, update, delete, search, and trash recovery.", "system")
    jarvis.add_knowledge("Security Monitor scans for threats, monitors network connections, and checks file integrity every 30 seconds.", "system")
    jarvis.add_knowledge("Email Client supports composing, drafting with AI, contacts management, and offline organization.", "system")
    jarvis.add_knowledge("Browser tool fetches web pages, caches content for offline reading, bookmarks, and searches history.", "system")

# ============== Pydantic Models ==============
class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = "default"

class FileOperation(BaseModel):
    path: str
    content: Optional[str] = ""
    new_name: Optional[str] = ""

class EmailCompose(BaseModel):
    to: str
    subject: str
    body: str
    draft: bool = False

class BrowserRequest(BaseModel):
    url: str

class SearchRequest(BaseModel):
    query: str

# ============== API Routes ==============

@app.get("/", response_class=HTMLResponse)
async def root():
    return FileResponse("static/index.html")

# ---- AI Assistant ----
@app.post("/api/ai/chat")
async def ai_chat(msg: ChatMessage):
    """Chat with JARVIS AI"""
    result = jarvis.chat(msg.message)
    security.log_activity("ai_chat", {"message": msg.message[:100]})
    return result

@app.post("/api/ai/command")
async def ai_command(msg: ChatMessage):
    """Execute natural language command"""
    result = jarvis.execute_command(msg.message)
    security.log_activity("ai_command", {"command": msg.message[:100]})
    return result

@app.post("/api/ai/learn")
async def ai_learn(data: dict):
    """Teach JARVIS new knowledge"""
    text = data.get("text", "")
    source = data.get("source", "user")
    if text:
        jarvis.add_knowledge(text, source)
        return {"success": True, "message": "Knowledge added to JARVIS memory"}
    return {"error": "No text provided"}

# ---- File Manager ----
@app.get("/api/files/list")
async def list_files(path: str = ""):
    return files.list_directory(path)

@app.post("/api/files/create-folder")
async def create_folder(op: FileOperation):
    return files.create_folder(op.path)

@app.post("/api/files/create-file")
async def create_file(op: FileOperation):
    return files.create_file(op.path, op.content)

@app.get("/api/files/read")
async def read_file(path: str):
    return files.read_file(path)

@app.post("/api/files/write")
async def write_file(op: FileOperation):
    return files.write_file(op.path, op.content)

@app.delete("/api/files/delete")
async def delete_file(path: str, permanent: bool = False):
    return files.delete_item(path, permanent)

@app.post("/api/files/rename")
async def rename_file(op: FileOperation):
    return files.rename_item(op.path, op.new_name)

@app.get("/api/files/search")
async def search_files(query: str):
    return {"results": files.search_files(query)}

# ---- Security ----
@app.get("/api/security/scan")
async def security_scan():
    return security.scan_system()

@app.get("/api/security/threats")
async def get_threats(limit: int = 50):
    return {"threats": security.get_threats(limit)}

@app.get("/api/security/activity")
async def get_activity(limit: int = 100):
    return {"activities": security.get_activity_log(limit)}

@app.get("/api/security/firewall")
async def get_firewall():
    return {"rules": security.get_firewall_rules()}

# ---- Email ----
@app.get("/api/email/inbox")
async def get_inbox(folder: str = "inbox"):
    return {"emails": email.get_inbox(folder)}

@app.post("/api/email/compose")
async def compose_email(data: EmailCompose):
    return email.compose_email(data.to, data.subject, data.body, draft=data.draft)

@app.post("/api/email/receive")
async def receive_email(data: dict):
    return email.receive_email(data.get("from", ""), data.get("subject", ""), data.get("body", ""))

@app.post("/api/email/read")
async def mark_read(data: dict):
    return email.mark_read(data.get("id"), data.get("folder", "inbox"))

@app.delete("/api/email/delete")
async def delete_email(id: str, folder: str = "inbox"):
    return email.delete_email(id, folder)

@app.get("/api/email/search")
async def search_emails(query: str):
    return {"results": email.search_emails(query)}

@app.get("/api/email/contacts")
async def get_contacts():
    return {"contacts": email.get_contacts()}

@app.post("/api/email/contacts")
async def add_contact(data: dict):
    return email.add_contact(data.get("name"), data.get("email"), data.get("tags", []))

@app.post("/api/email/ai-draft")
async def ai_draft(data: dict):
    return {"draft": email.ai_draft(data.get("topic", ""), data.get("tone", "professional"))}

# ---- Browser ----
@app.post("/api/browser/fetch")
async def fetch_page(req: BrowserRequest):
    return browser.fetch_page(req.url)

@app.get("/api/browser/history")
async def get_history():
    return {"history": browser.get_history()}

@app.post("/api/browser/search")
async def browser_search(req: SearchRequest):
    return {"results": browser.search_web(req.query)}

@app.post("/api/browser/bookmark")
async def add_bookmark(data: dict):
    return browser.add_bookmark(data.get("url"), data.get("title", ""), data.get("tags", []))

@app.get("/api/browser/bookmarks")
async def get_bookmarks():
    return {"bookmarks": browser.get_bookmarks()}

# ---- System ----
@app.get("/api/system/status")
async def system_status():
    import psutil
    return {
        "cpu": psutil.cpu_percent(interval=0.5),
        "memory": dict(psutil.virtual_memory()._asdict()),
        "disk": dict(psutil.disk_usage('/')._asdict()),
        "boot_time": datetime.fromtimestamp(psutil.boot_time()).isoformat(),
        "processes": len(psutil.pids())
    }

@app.get("/api/system/time")
async def system_time():
    return {"time": datetime.now().isoformat()}

# ---- Notes ----
@app.get("/api/notes")
async def get_notes():
    notes_dir = "data/notes"
    os.makedirs(notes_dir, exist_ok=True)
    notes = []
    for f in os.listdir(notes_dir):
        if f.endswith('.json'):
            with open(os.path.join(notes_dir, f), 'r') as fh:
                notes.append(json.load(fh))
    return {"notes": sorted(notes, key=lambda x: x.get('updated', ''), reverse=True)}

@app.post("/api/notes")
async def save_note(data: dict):
    notes_dir = "data/notes"
    os.makedirs(notes_dir, exist_ok=True)
    note_id = data.get("id") or str(datetime.now().timestamp())
    note = {
        "id": note_id,
        "title": data.get("title", "Untitled"),
        "content": data.get("content", ""),
        "updated": datetime.now().isoformat()
    }
    with open(os.path.join(notes_dir, f"{note_id}.json"), 'w') as f:
        json.dump(note, f)
    return note

@app.delete("/api/notes/{note_id}")
async def delete_note(note_id: str):
    path = f"data/notes/{note_id}.json"
    if os.path.exists(path):
        os.remove(path)
    return {"success": True}

# ---- WebSocket for real-time updates ----
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)

            if msg.get("type") == "chat":
                result = jarvis.chat(msg.get("message", ""))
                await websocket.send_json({
                    "type": "chat_response",
                    "data": result
                })
            elif msg.get("type") == "ping":
                await websocket.send_json({"type": "pong", "time": datetime.now().isoformat()})
    except:
        pass

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    print("=" * 60)
    print("  JARVIS AI-OS v1.0.0 - Starting up...")
    print("  Offline AI Operating System")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
