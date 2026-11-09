from typing import Dict, Any
from app.models.entities import LeadStatus

class ScoringService:
    @classmethod
    def calculate_urgency_and_fit(
        cls,
        leads_per_month: int,
        close_rate_pct: float,
        avg_ticket: float,
        industry: str,
        corporate_email: bool = False
    ) -> Dict[str, Any]:
        """
        Reverse-Intent Funnel: Calcula el Revenue Leakage y el Urgency Score (0-100)
        """
        # Fuga de dinero estimada por mes: leads que se pierden * ticket
        lost_leads = leads_per_month * (1.0 - (close_rate_pct / 100.0))
        monthly_revenue_leak = round(lost_leads * avg_ticket, 2)

        score = 20.0 # Base

        # Criterio Ticket Promedio
        if avg_ticket >= 10000:
            score += 30
        elif avg_ticket >= 3000:
            score += 20
        elif avg_ticket >= 1000:
            score += 10

        # Criterio Volumen
        if leads_per_month >= 100:
            score += 25
        elif leads_per_month >= 30:
            score += 15

        # Margen de mejora (baja tasa de cierre = alta urgencia de solución)
        if close_rate_pct < 15:
            score += 20
        elif close_rate_pct < 30:
            score += 10

        if corporate_email:
            score += 10

        score = min(score, 100.0)

        if score >= 75:
            classification = LeadStatus.HOT
        elif score >= 45:
            classification = LeadStatus.WARM
        else:
            classification = LeadStatus.COLD

        return {
            "urgency_score": score,
            "monthly_revenue_leak": monthly_revenue_leak,
            "classification": classification
        }
