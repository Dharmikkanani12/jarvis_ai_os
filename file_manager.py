"""
Advanced File Manager with AI-powered organization
"""
import os
import shutil
import json
import hashlib
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

class FileManager:
    def __init__(self, root_dir: str = "data/files"):
        self.root_dir = os.path.abspath(root_dir)
        os.makedirs(self.root_dir, exist_ok=True)
        self.trash_dir = os.path.join(os.path.dirname(root_dir), ".trash")
        os.makedirs(self.trash_dir, exist_ok=True)

    def list_directory(self, path: str = "") -> Dict:
        """List files and folders"""
        full_path = os.path.join(self.root_dir, path)
        if not os.path.exists(full_path):
            return {"error": "Path not found"}

        items = []
        try:
            for item in os.listdir(full_path):
                item_path = os.path.join(full_path, item)
                stat = os.stat(item_path)
                items.append({
                    "name": item,
                    "path": os.path.relpath(item_path, self.root_dir),
                    "type": "directory" if os.path.isdir(item_path) else "file",
                    "size": stat.st_size if os.path.isfile(item_path) else None,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "created": datetime.fromtimestamp(stat.st_ctime).isoformat()
                })
        except PermissionError:
            return {"error": "Permission denied"}

        return {
            "path": path,
            "items": sorted(items, key=lambda x: (x["type"] != "directory", x["name"].lower())),
            "parent": os.path.dirname(path) if path else None
        }

    def create_folder(self, path: str) -> Dict:
        """Create new folder"""
        full_path = os.path.join(self.root_dir, path)
        try:
            os.makedirs(full_path, exist_ok=True)
            return {"success": True, "path": path}
        except Exception as e:
            return {"error": str(e)}

    def create_file(self, path: str, content: str = "") -> Dict:
        """Create new file"""
        full_path = os.path.join(self.root_dir, path)
        try:
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return {"success": True, "path": path}
        except Exception as e:
            return {"error": str(e)}

    def read_file(self, path: str) -> Dict:
        """Read file content"""
        full_path = os.path.join(self.root_dir, path)
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return {"content": content, "path": path}
        except Exception as e:
            return {"error": str(e)}

    def write_file(self, path: str, content: str) -> Dict:
        """Write to file"""
        full_path = os.path.join(self.root_dir, path)
        try:
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return {"success": True, "path": path}
        except Exception as e:
            return {"error": str(e)}

    def delete_item(self, path: str, permanent: bool = False) -> Dict:
        """Move to trash or permanently delete"""
        full_path = os.path.join(self.root_dir, path)
        if not os.path.exists(full_path):
            return {"error": "File not found"}

        try:
            if permanent:
                if os.path.isdir(full_path):
                    shutil.rmtree(full_path)
                else:
                    os.remove(full_path)
                return {"success": True, "message": "Permanently deleted"}
            else:
                # Move to trash with timestamp
                trash_name = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{os.path.basename(path)}"
                shutil.move(full_path, os.path.join(self.trash_dir, trash_name))
                return {"success": True, "message": "Moved to trash"}
        except Exception as e:
            return {"error": str(e)}

    def rename_item(self, path: str, new_name: str) -> Dict:
        """Rename file or folder"""
        full_path = os.path.join(self.root_dir, path)
        new_path = os.path.join(os.path.dirname(full_path), new_name)
        try:
            os.rename(full_path, new_path)
            return {"success": True, "new_path": os.path.relpath(new_path, self.root_dir)}
        except Exception as e:
            return {"error": str(e)}

    def search_files(self, query: str) -> List[Dict]:
        """Search files by name"""
        results = []
        query_lower = query.lower()
        for root, dirs, files in os.walk(self.root_dir):
            for name in dirs + files:
                if query_lower in name.lower():
                    full_path = os.path.join(root, name)
                    results.append({
                        "name": name,
                        "path": os.path.relpath(full_path, self.root_dir),
                        "type": "directory" if os.path.isdir(full_path) else "file"
                    })
        return results

    def get_file_hash(self, path: str) -> str:
        """Get SHA256 hash of file for integrity checking"""
        full_path = os.path.join(self.root_dir, path)
        sha256 = hashlib.sha256()
        with open(full_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256.update(chunk)
        return sha256.hexdigest()
