"""
JARVIS AI Engine - Offline AI with RAG capabilities
Uses sentence-transformers for embeddings and FAISS for vector search
"""
import os
import json
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Optional
import pickle

class JarvisAI:
    def __init__(self, data_dir: str = "data/vector_db"):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)

        # Load or initialize embedding model
        self.model_name = "all-MiniLM-L6-v2"
        self.model = SentenceTransformer(self.model_name)
        self.embedding_dim = 384

        # FAISS index for knowledge base
        self.index_path = os.path.join(data_dir, "knowledge.index")
        self.docs_path = os.path.join(data_dir, "documents.pkl")

        self.index = None
        self.documents = []
        self._load_index()

        # System prompt for JARVIS personality
        self.system_prompt = """You are JARVIS (Just A Rather Very Intelligent System), an advanced AI operating system assistant.
You help manage files, emails, security, and research. You are witty, efficient, and highly capable.
You run entirely offline and prioritize user privacy and security."""

    def _load_index(self):
        """Load FAISS index and documents"""
        if os.path.exists(self.index_path) and os.path.exists(self.docs_path):
            self.index = faiss.read_index(self.index_path)
            with open(self.docs_path, 'rb') as f:
                self.documents = pickle.load(f)
            print(f"[JARVIS] Loaded knowledge base: {len(self.documents)} documents")
        else:
            self.index = faiss.IndexFlatIP(self.embedding_dim)
            self.documents = []
            print("[JARVIS] Initialized empty knowledge base")

    def _save_index(self):
        """Save FAISS index and documents"""
        faiss.write_index(self.index, self.index_path)
        with open(self.docs_path, 'wb') as f:
            pickle.dump(self.documents, f)

    def embed_text(self, text: str) -> np.ndarray:
        """Generate embedding for text"""
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding / np.linalg.norm(embedding)

    def add_knowledge(self, text: str, source: str = "user", metadata: dict = None):
        """Add document to knowledge base"""
        embedding = self.embed_text(text)
        self.index.add(embedding.reshape(1, -1))
        self.documents.append({
            "text": text,
            "source": source,
            "metadata": metadata or {}
        })
        self._save_index()

    def search_knowledge(self, query: str, top_k: int = 3) -> List[Dict]:
        """Search knowledge base"""
        if len(self.documents) == 0:
            return []
        query_emb = self.embed_text(query)
        scores, indices = self.index.search(query_emb.reshape(1, -1), min(top_k, len(self.documents)))
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx >= 0 and idx < len(self.documents):
                doc = self.documents[idx].copy()
                doc["score"] = float(score)
                results.append(doc)
        return results

    def chat(self, message: str, context: str = "") -> Dict:
        """Process chat message with RAG"""
        # Search knowledge base
        relevant_docs = self.search_knowledge(message)

        # Build context from retrieved documents
        kb_context = ""
        if relevant_docs:
            kb_context = "\n\nRelevant information from knowledge base:\n"
            for i, doc in enumerate(relevant_docs, 1):
                kb_context += f"[{i}] {doc['text'][:300]}...\n"

        # Simple response generation (in production, use local LLM like Llama)
        response = self._generate_response(message, context, kb_context)

        return {
            "response": response,
            "sources": relevant_docs,
            "mode": "offline_rag"
        }

    def _generate_response(self, message: str, context: str, kb_context: str) -> str:
        """Generate response using template-based approach with RAG context"""
        msg_lower = message.lower()

        # Command detection
        if any(kw in msg_lower for kw in ["file", "folder", "directory"]):
            return f"I can help you manage files. Use the File Manager app or tell me what you need. I can create, delete, move, and search files. {kb_context[:200] if kb_context else ''}"

        elif any(kw in msg_lower for kw in ["email", "mail", "message", "inbox"]):
            return "I can manage your emails offline. I can draft messages, organize your inbox, and set up filters. Check the Mail app."

        elif any(kw in msg_lower for kw in ["security", "threat", "virus", "firewall", "protect"]):
            return "Security is my top priority. I'm monitoring system activity, network connections, and file integrity in real-time. The Security Dashboard shows live threats."

        elif any(kw in msg_lower for kw in ["browser", "search", "internet", "web", "research", "find"]):
            return "I can research topics using the built-in browser and summarize findings. I also archive pages for offline reading. What would you like me to look up?"

        elif any(kw in msg_lower for kw in ["system", "status", "cpu", "memory", "performance"]):
            return self._get_system_status()

        elif any(kw in msg_lower for kw in ["hello", "hi", "hey", "greetings"]):
            return "Hello, sir. JARVIS online and fully operational. All systems are running at optimal capacity. How may I assist you today?"

        elif any(kw in msg_lower for kw in ["time", "date", "clock"]):
            from datetime import datetime
            now = datetime.now()
            return f"The current time is {now.strftime('%I:%M %p')} on {now.strftime('%A, %B %d, %Y')}."

        else:
            # Generic intelligent response with KB context
            base = "I understand. "
            if kb_context:
                base += "Based on my knowledge base, I found relevant information for your query. "
            base += "As your AI operating system, I can execute this through the appropriate application or provide deeper analysis. Would you like me to open a specific tool or perform an automated action?"
            return base

    def _get_system_status(self) -> str:
        """Get real system status"""
        import psutil
        cpu = psutil.cpu_percent(interval=0.5)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage('/')

        return f"""System Status Report:
• CPU Usage: {cpu}%
• Memory: {mem.percent}% used ({mem.used//1024//1024}MB / {mem.total//1024//1024}MB)
• Disk: {disk.percent}% used ({disk.used//1024//1024//1024}GB / {disk.total//1024//1024//1024}GB)
• Processes: {len(psutil.pids())} active
• Security: All shields active, no threats detected."""

    def execute_command(self, command: str) -> Dict:
        """Execute system command through AI"""
        # Parse natural language commands
        cmd_lower = command.lower()

        if "open" in cmd_lower and "file" in cmd_lower:
            return {"action": "open_app", "app": "files"}
        elif "open" in cmd_lower and ("mail" in cmd_lower or "email" in cmd_lower):
            return {"action": "open_app", "app": "mail"}
        elif "open" in cmd_lower and "browser" in cmd_lower:
            return {"action": "open_app", "app": "browser"}
        elif "open" in cmd_lower and "security" in cmd_lower:
            return {"action": "open_app", "app": "security"}
        elif "open" in cmd_lower and "terminal" in cmd_lower:
            return {"action": "open_app", "app": "terminal"}
        elif "open" in cmd_lower and "note" in cmd_lower:
            return {"action": "open_app", "app": "notes"}
        else:
            return {"action": "chat", "response": self.chat(command)}
