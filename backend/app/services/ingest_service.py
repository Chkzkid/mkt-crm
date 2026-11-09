import re
import pandas as pd
from typing import List, Dict, Any
from app.models.entities import LeadStatus

class IngestService:
    COLUMN_ALIASES = {
        "name": ["nombre", "name", "cliente", "lead", "contacto", "full_name"],
        "email": ["email", "correo", "e-mail", "mail", "correo_electronico"],
        "phone": ["telefono", "phone", "tel", "celular", "whatsapp", "movil"],
        "company": ["empresa", "company", "organizacion", "negocio", "business"],
        "status": ["status", "estado", "etiqueta", "fase", "categoria"],
        "notes": ["notas", "notes", "comentarios", "observaciones", "historial"]
    }

    @classmethod
    def detect_mapping(cls, columns: List[str]) -> Dict[str, str]:
        mapping = {}
        for col in columns:
            col_clean = col.strip().lower().replace(" ", "_")
            for field, aliases in cls.COLUMN_ALIASES.items():
                if col_clean in aliases or any(alias in col_clean for alias in aliases):
                    if field not in mapping.values():
                        mapping[col] = field
                        break
        return mapping

    @classmethod
    def clean_phone(cls, phone_val: Any) -> str:
        if not phone_val or pd.isna(phone_val):
            return ""
        s = str(phone_val).strip()
        cleaned = re.sub(r"[^\d+]", "", s)
        return cleaned

    @classmethod
    def clean_email(cls, email_val: Any) -> str:
        if not email_val or pd.isna(email_val):
            return ""
        s = str(email_val).strip().lower()
        if re.match(r"[^@]+@[^@]+\.[^@]+", s):
            return s
        return ""

    @classmethod
    def classify_status(cls, raw_status: Any, notes: str = "") -> LeadStatus:
        s = str(raw_status).strip().lower() if raw_status and not pd.isna(raw_status) else ""
        n = str(notes).lower() if notes else ""
        
        if "cotiz" in s or "presupuesto" in s or "cotiz" in n:
            return LeadStatus.PENDING_QUOTE
        elif "activo" in s or "cliente" in s or "compr" in n:
            return LeadStatus.ACTIVE_CLIENT
        elif "inactiv" in s or "pausa" in s:
            return LeadStatus.INACTIVE_CLIENT
        elif "caliente" in s or "hot" in s:
            return LeadStatus.HOT
        elif "tibio" in s or "warm" in s:
            return LeadStatus.WARM
        else:
            return LeadStatus.COLD

    @classmethod
    def process_dataframe(cls, df: pd.DataFrame, custom_mapping: Dict[str, str] = None) -> List[Dict[str, Any]]:
        mapping = custom_mapping or cls.detect_mapping(list(df.columns))
        records = []
        seen_keys = set()

        for _, row in df.iterrows():
            item = {
                "name": "",
                "email": "",
                "phone": "",
                "company": "",
                "status": LeadStatus.COLD,
                "notes": "",
                "source": "excel_ingest"
            }
            for orig_col, target_field in mapping.items():
                if orig_col in row and not pd.isna(row[orig_col]):
                    item[target_field] = row[orig_col]

            item["email"] = cls.clean_email(item.get("email"))
            item["phone"] = cls.clean_phone(item.get("phone"))
            item["name"] = str(item.get("name") or "").strip()
            item["company"] = str(item.get("company") or "").strip()
            item["status"] = cls.classify_status(item.get("status"), item.get("notes"))

            # Deduplication key
            dedup_key = (item["email"] or item["phone"] or item["name"]).lower()
            if not dedup_key or dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)
            records.append(item)

        return records
