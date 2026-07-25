"""
Offline Email Client with AI drafting and organization
"""
import os
import json
import uuid
from datetime import datetime
from typing import List, Dict, Optional

class EmailClient:
    def __init__(self, data_dir: str = "data/emails"):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        self.inbox_file = os.path.join(data_dir, "inbox.json")
        self.sent_file = os.path.join(data_dir, "sent.json")
        self.drafts_file = os.path.join(data_dir, "drafts.json")
        self.contacts_file = os.path.join(data_dir, "contacts.json")

        self._ensure_files()

    def _ensure_files(self):
        for f in [self.inbox_file, self.sent_file, self.drafts_file, self.contacts_file]:
            if not os.path.exists(f):
                with open(f, 'w') as fh:
                    json.dump([], fh)

    def _load(self, filepath: str) -> List[Dict]:
        with open(filepath, 'r') as f:
            return json.load(f)

    def _save(self, filepath: str, data: List[Dict]):
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)

    def get_inbox(self, folder: str = "inbox") -> List[Dict]:
        if folder == "inbox":
            return self._load(self.inbox_file)
        elif folder == "sent":
            return self._load(self.sent_file)
        elif folder == "drafts":
            return self._load(self.drafts_file)
        return []

    def compose_email(self, to: str, subject: str, body: str, 
                      from_addr: str = "user@ai-os.local", 
                      draft: bool = False) -> Dict:
        email = {
            "id": str(uuid.uuid4()),
            "from": from_addr,
            "to": to,
            "subject": subject,
            "body": body,
            "timestamp": datetime.now().isoformat(),
            "read": False,
            "starred": False,
            "folder": "drafts" if draft else "sent"
        }

        if draft:
            drafts = self._load(self.drafts_file)
            drafts.append(email)
            self._save(self.drafts_file, drafts)
        else:
            sent = self._load(self.sent_file)
            sent.append(email)
            self._save(self.sent_file, sent)

        return email

    def receive_email(self, from_addr: str, subject: str, body: str) -> Dict:
        """Simulate receiving email (for demo/testing)"""
        email = {
            "id": str(uuid.uuid4()),
            "from": from_addr,
            "to": "user@ai-os.local",
            "subject": subject,
            "body": body,
            "timestamp": datetime.now().isoformat(),
            "read": False,
            "starred": False,
            "folder": "inbox"
        }
        inbox = self._load(self.inbox_file)
        inbox.insert(0, email)
        self._save(self.inbox_file, inbox)
        return email

    def mark_read(self, email_id: str, folder: str = "inbox") -> Dict:
        emails = self._load(self.inbox_file if folder == "inbox" else self.sent_file)
        for e in emails:
            if e["id"] == email_id:
                e["read"] = True
                break
        self._save(self.inbox_file if folder == "inbox" else self.sent_file, emails)
        return {"success": True}

    def delete_email(self, email_id: str, folder: str = "inbox") -> Dict:
        emails = self._load(self.inbox_file if folder == "inbox" else self.sent_file)
        emails = [e for e in emails if e["id"] != email_id]
        self._save(self.inbox_file if folder == "inbox" else self.sent_file, emails)
        return {"success": True}

    def search_emails(self, query: str) -> List[Dict]:
        results = []
        query_lower = query.lower()
        for folder_file in [self.inbox_file, self.sent_file, self.drafts_file]:
            emails = self._load(folder_file)
            for e in emails:
                if (query_lower in e.get("subject", "").lower() or 
                    query_lower in e.get("body", "").lower() or
                    query_lower in e.get("from", "").lower()):
                    results.append(e)
        return results

    def get_contacts(self) -> List[Dict]:
        return self._load(self.contacts_file)

    def add_contact(self, name: str, email: str, tags: List[str] = None) -> Dict:
        contacts = self._load(self.contacts_file)
        contacts.append({
            "id": str(uuid.uuid4()),
            "name": name,
            "email": email,
            "tags": tags or [],
            "added": datetime.now().isoformat()
        })
        self._save(self.contacts_file, contacts)
        return {"success": True}

    def ai_draft(self, topic: str, tone: str = "professional") -> str:
        """AI-powered email drafting"""
        templates = {
            "professional": f"""Subject: Regarding {topic}

Dear Recipient,

I hope this message finds you well. I am writing to discuss {topic}.

[AI has prepared this draft based on your request. Please review and customize as needed.]

Best regards,
[Your Name]""",
            "casual": f"""Hey!

Just wanted to reach out about {topic}. Let me know what you think!

Cheers""",
            "urgent": f"""URGENT: {topic}

This requires immediate attention regarding {topic}. Please respond at your earliest convenience.

Thank you,"""
        }
        return templates.get(tone, templates["professional"])
