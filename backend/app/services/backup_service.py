import os
import json
import csv
from datetime import datetime
from typing import Dict, Any, List
from app.core.config import settings

class BackupService:
    @classmethod
    def create_local_backup(cls, leads: List[Dict[str, Any]], users: List[Dict[str, Any]], proposals: List[Dict[str, Any]]) -> Dict[str, str]:
        os.makedirs(settings.BACKUP_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 1. Backup JSON completo
        json_filename = f"procrm_backup_{timestamp}.json"
        json_path = os.path.join(settings.BACKUP_DIR, json_filename)
        data = {
            "backup_date": datetime.utcnow().isoformat(),
            "leads": leads,
            "users": users,
            "proposals": proposals
        }
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)

        # 2. Backup CSV de Leads (para importar directamente a Excel/Drive)
        csv_filename = f"leads_export_{timestamp}.csv"
        csv_path = os.path.join(settings.BACKUP_DIR, csv_filename)
        if leads:
            fieldnames = list(leads[0].keys())
            with open(csv_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                for lead in leads:
                    writer.writerow(lead)

        return {
            "status": "SUCCESS",
            "json_path": json_path,
            "csv_path": csv_path,
            "timestamp": timestamp,
            "drive_ready_folder": settings.BACKUP_DIR
        }
