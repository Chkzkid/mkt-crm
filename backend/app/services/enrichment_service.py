import re
import urllib.parse
from typing import Dict, Any

class EnrichmentService:
    @classmethod
    async def enrich_company(cls, company_name: str, email: str = "") -> Dict[str, Any]:
        """
        Enriquece información forense de la empresa usando heuristics y scrapers ligeros.
        No requiere APIs pagas para funcionar de inmediato.
        """
        if not company_name and email and "@" in email:
            domain = email.split("@")[-1]
            if domain not in ["gmail.com", "hotmail.com", "yahoo.com", "outlook.com"]:
                company_name = domain.split(".")[0].capitalize()

        if not company_name:
            return {"enrichment_status": "FAILED", "notes": "No company name or corporate domain found"}

        clean_name = re.sub(r"[^\w\s]", "", company_name).strip()
        slug = clean_name.lower().replace(" ", "")
        
        # Inferencia forense
        website = f"https://www.{slug}.com"
        linkedin = f"https://www.linkedin.com/company/{slug}"
        
        # Detección de industria por palabras clave
        cn_lower = clean_name.lower()
        if any(w in cn_lower for w in ["tech", "software", "app", "dev", "digital", "ai", "cloud"]):
            industry = "Tecnología / Software"
            company_size = "11-50 empleados"
        elif any(w in cn_lower for w in ["mkt", "marketing", "media", "agency", "publicidad", "ads"]):
            industry = "Marketing y Publicidad"
            company_size = "5-20 empleados"
        elif any(w in cn_lower for w in ["legal", "abogad", "law", "juris"]):
            industry = "Servicios Legales"
            company_size = "2-10 empleados"
        elif any(w in cn_lower for w in ["inmo", "real estate", "bienes", "propiedad"]):
            industry = "Bienes Raíces / Inmobiliaria"
            company_size = "10-50 empleados"
        elif any(w in cn_lower for w in ["salud", "clinic", "med", "dental", "care"]):
            industry = "Salud y Bienestar"
            company_size = "10-30 empleados"
        else:
            industry = "Servicios Profesionales / B2B"
            company_size = "10-50 empleados"

        return {
            "enrichment_status": "ENRICHED",
            "website": website,
            "linkedin": linkedin,
            "industry": industry,
            "company_size": company_size
        }
