from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.models.entities import Lead, LeadStatus

class ReactivationEngine:
    MICRO_VALUE_STEPS = [
        {
            "stage": 1,
            "title_es": "Micro-Reporte de Eficiencia",
            "title_en": "Efficiency Micro-Report",
            "message_es": "Hemos preparado una comparativa de métricas clave de conversión para tu sector.",
            "message_en": "We prepared key conversion benchmarks specifically for your industry.",
            "days_delay": 0
        },
        {
            "stage": 2,
            "title_es": "Dato de Alto Impacto Sectorial",
            "title_en": "High-Impact Industry Metric",
            "message_es": "¿Sabías que el 68% de las oportunidades se pierden por falta de seguimiento en menos de 1 hora?",
            "message_en": "Did you know that 68% of opportunities are lost when not followed up within 1 hour?",
            "days_delay": 4
        },
        {
            "stage": 3,
            "title_es": "Auditoría / Diagnóstico Rápido",
            "title_en": "Quick Diagnostic Audit",
            "message_es": "Accede a nuestra calculadora para medir tu fuga de ingresos actual en 60 segundos.",
            "message_en": "Access our interactive tool to measure your revenue leakage in 60 seconds.",
            "days_delay": 8
        },
        {
            "stage": 4,
            "title_es": "Cierre de Ventana de Oportunidad",
            "title_en": "Closing Opportunity Window",
            "message_es": "¿Sigue siendo una prioridad optimizar la captación este trimestre?",
            "message_en": "Is optimizing client acquisition still a priority for you this quarter?",
            "days_delay": 12
        }
    ]

    @classmethod
    def get_next_step(cls, current_stage: int) -> Dict[str, Any]:
        next_stage = current_stage + 1
        for step in cls.MICRO_VALUE_STEPS:
            if step["stage"] == next_stage:
                return step
        return None

    @classmethod
    def process_click_alert(cls, lead: Lead) -> Dict[str, Any]:
        """
        Dispara Alerta de Alta Temperatura cuando un lead frío interactúa con un enlace.
        """
        lead.engagement_clicks = (lead.engagement_clicks or 0) + 1
        lead.last_interaction = datetime.utcnow()
        lead.urgency_score = min(100.0, (lead.urgency_score or 20.0) + 25.0)

        # Elevar estatus automáticamente
        if lead.status in [LeadStatus.COLD, LeadStatus.INACTIVE_CLIENT]:
            lead.status = LeadStatus.WARM
        if lead.urgency_score >= 75:
            lead.status = LeadStatus.HOT

        return {
            "alert": "ALTA_TEMPERATURA",
            "lead_id": lead.id,
            "lead_name": lead.name,
            "new_status": lead.status,
            "urgency_score": lead.urgency_score
        }
