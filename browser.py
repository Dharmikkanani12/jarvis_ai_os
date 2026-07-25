"""
AI Browser & Research Tool - Offline-capable with web scraping
"""
import os
import json
import re
import urllib.request
import urllib.parse
from datetime import datetime
from typing import List, Dict, Optional
from html.parser import HTMLParser

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
        self.skip_tags = {'script', 'style', 'nav', 'footer', 'header'}
        self.current_tag = None

    def handle_starttag(self, tag, attrs):
        self.current_tag = tag

    def handle_endtag(self, tag):
        self.current_tag = None

    def handle_data(self, data):
        if self.current_tag not in self.skip_tags and data.strip():
            self.text.append(data.strip())

    def get_text(self):
        return ' '.join(self.text)

class Browser:
    def __init__(self, cache_dir: str = "data/browser_cache"):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
        self.history_file = os.path.join(cache_dir, "history.json")
        self.bookmarks_file = os.path.join(cache_dir, "bookmarks.json")
        self._ensure_files()

    def _ensure_files(self):
        for f in [self.history_file, self.bookmarks_file]:
            if not os.path.exists(f):
                with open(f, 'w') as fh:
                    json.dump([], fh)

    def fetch_page(self, url: str) -> Dict:
        """Fetch and parse web page"""
        try:
            # Validate URL
            if not url.startswith(('http://', 'https://')):
                url = 'https://' + url

            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })

            with urllib.request.urlopen(req, timeout=10) as response:
                html = response.read().decode('utf-8', errors='ignore')

                # Extract title
                title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
                title = title_match.group(1).strip() if title_match else url

                # Extract text
                extractor = TextExtractor()
                extractor.feed(html)
                text = extractor.get_text()[:5000]  # Limit text

                # Cache page
                cache_id = re.sub(r'[^\w]', '_', url)[:100]
                cache_path = os.path.join(self.cache_dir, f"{cache_id}.json")
                page_data = {
                    "url": url,
                    "title": title,
                    "text": text,
                    "cached_at": datetime.now().isoformat()
                }
                with open(cache_path, 'w') as f:
                    json.dump(page_data, f)

                # Log history
                self._add_history(url, title)

                return {"success": True, "title": title, "text": text[:2000], "url": url}
        except Exception as e:
            return {"error": str(e), "url": url}

    def _add_history(self, url: str, title: str):
        history = []
        if os.path.exists(self.history_file):
            with open(self.history_file, 'r') as f:
                history = json.load(f)
        history.insert(0, {"url": url, "title": title, "time": datetime.now().isoformat()})
        with open(self.history_file, 'w') as f:
            json.dump(history[:100], f)

    def get_history(self) -> List[Dict]:
        if os.path.exists(self.history_file):
            with open(self.history_file, 'r') as f:
                return json.load(f)
        return []

    def search_web(self, query: str) -> List[Dict]:
        """Simulate web search with curated results"""
        # In offline mode, search local knowledge
        # In online mode, could use DuckDuckGo API
        results = []

        # Check cache first
        for filename in os.listdir(self.cache_dir):
            if filename.endswith('.json') and filename not in ['history.json', 'bookmarks.json']:
                with open(os.path.join(self.cache_dir, filename), 'r') as f:
                    page = json.load(f)
                    if query.lower() in page.get('text', '').lower() or query.lower() in page.get('title', '').lower():
                        results.append({
                            "title": page['title'],
                            "url": page['url'],
                            "snippet": page['text'][:200] + "...",
                            "source": "cache"
                        })

        return results[:10]

    def add_bookmark(self, url: str, title: str = "", tags: List[str] = None) -> Dict:
        bookmarks = []
        if os.path.exists(self.bookmarks_file):
            with open(self.bookmarks_file, 'r') as f:
                bookmarks = json.load(f)
        bookmarks.append({
            "url": url,
            "title": title or url,
            "tags": tags or [],
            "added": datetime.now().isoformat()
        })
        with open(self.bookmarks_file, 'w') as f:
            json.dump(bookmarks, f)
        return {"success": True}

    def get_bookmarks(self) -> List[Dict]:
        if os.path.exists(self.bookmarks_file):
            with open(self.bookmarks_file, 'r') as f:
                return json.load(f)
        return []
