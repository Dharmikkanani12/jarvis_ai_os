"""
Security Monitor - Real-time threat detection and system protection
"""
import os
import json
import time
import hashlib
import threading
from datetime import datetime
from typing import List, Dict
import psutil

class SecurityMonitor:
    def __init__(self, log_dir: str = "logs"):
        self.log_dir = log_dir
        os.makedirs(log_dir, exist_ok=True)
        self.threat_log = os.path.join(log_dir, "threats.json")
        self.activity_log = os.path.join(log_dir, "activity.json")
        self.file_hashes = {}  # Baseline file hashes
        self.monitoring = False
        self.monitor_thread = None
        self.threats = []
        self.activities = []
        self._load_logs()

    def _load_logs(self):
        if os.path.exists(self.threat_log):
            with open(self.threat_log, 'r') as f:
                self.threats = json.load(f)
        if os.path.exists(self.activity_log):
            with open(self.activity_log, 'r') as f:
                self.activities = json.load(f)

    def _save_logs(self):
        with open(self.threat_log, 'w') as f:
            json.dump(self.threats[-100:], f)  # Keep last 100
        with open(self.activity_log, 'w') as f:
            json.dump(self.activities[-500:], f)  # Keep last 500

    def scan_system(self) -> Dict:
        """Perform full system security scan"""
        results = {
            "timestamp": datetime.now().isoformat(),
            "status": "secure",
            "findings": [],
            "network_connections": [],
            "processes": []
        }

        # Check network connections
        try:
            connections = psutil.net_connections()
            suspicious = []
            for conn in connections[:50]:  # Limit for performance
                if conn.status == 'LISTEN' and conn.laddr.port not in [80, 443, 22, 8000]:
                    suspicious.append({
                        "type": "open_port",
                        "port": conn.laddr.port,
                        "status": conn.status,
                        "pid": conn.pid
                    })
            results["network_connections"] = suspicious
            if suspicious:
                results["findings"].extend(suspicious)
        except:
            pass

        # Check processes
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            try:
                info = proc.info
                if info['cpu_percent'] and info['cpu_percent'] > 50:
                    results["processes"].append({
                        "type": "high_cpu",
                        "pid": info['pid'],
                        "name": info['name'],
                        "cpu": info['cpu_percent']
                    })
            except:
                pass

        # File integrity check (sample)
        results["file_integrity"] = self._check_file_integrity()

        if results["findings"]:
            results["status"] = "warning"
            self._log_threat(results["findings"])

        return results

    def _check_file_integrity(self) -> List[Dict]:
        """Check critical files for unauthorized changes"""
        changes = []
        critical_paths = ["data/files", "core", "main.py"]
        for path in critical_paths:
            if os.path.exists(path):
                for root, _, files in os.walk(path):
                    for file in files[:20]:  # Sample
                        full = os.path.join(root, file)
                        try:
                            current_hash = hashlib.sha256(open(full, 'rb').read()).hexdigest()
                            key = full
                            if key in self.file_hashes and self.file_hashes[key] != current_hash:
                                changes.append({
                                    "file": full,
                                    "type": "modified",
                                    "severity": "medium"
                                })
                            self.file_hashes[key] = current_hash
                        except:
                            pass
        return changes

    def _log_threat(self, findings: List[Dict]):
        for finding in findings:
            self.threats.append({
                "timestamp": datetime.now().isoformat(),
                "finding": finding
            })
        self._save_logs()

    def get_threats(self, limit: int = 50) -> List[Dict]:
        return self.threats[-limit:]

    def get_activity_log(self, limit: int = 100) -> List[Dict]:
        return self.activities[-limit:]

    def log_activity(self, action: str, details: dict):
        self.activities.append({
            "timestamp": datetime.now().isoformat(),
            "action": action,
            "details": details
        })
        self._save_logs()

    def start_monitoring(self):
        """Start background security monitoring"""
        self.monitoring = True
        def monitor_loop():
            while self.monitoring:
                self.scan_system()
                time.sleep(30)  # Scan every 30 seconds
        self.monitor_thread = threading.Thread(target=monitor_loop, daemon=True)
        self.monitor_thread.start()

    def stop_monitoring(self):
        self.monitoring = False

    def get_firewall_rules(self) -> List[Dict]:
        return [
            {"port": 8000, "service": "AI-OS API", "status": "open", "trusted": True},
            {"port": 22, "service": "SSH", "status": "filtered", "trusted": True},
            {"port": 80, "service": "HTTP", "status": "filtered", "trusted": False},
            {"port": 443, "service": "HTTPS", "status": "filtered", "trusted": True}
        ]
