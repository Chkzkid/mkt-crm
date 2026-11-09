import uuid
from datetime import datetime, timedelta
from typing import Dict, Any
from jinja2 import Template

HTML_PROPOSAL_TEMPLATE = """
<!DOCTYPE html>
<html lang="{{ lang }}">
<head>
    <meta charset="UTF-8">
    <title>Propuesta Comercial - {{ proposal.title }}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 40px; background: #f8fafc; color: #1e293b; }
        .card { background: white; max-width: 780px; margin: 0 auto; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); padding: 40px; border-top: 6px solid {{ brand.primary_color }}; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
        .brand-name { font-size: 24px; font-weight: bold; color: {{ brand.primary_color }}; }
        .badge { background: #fee2e2; color: #dc2626; padding: 6px 12px; border-radius: 9999px; font-weight: bold; font-size: 13px; }
        .section-title { font-size: 16px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-top: 30px; margin-bottom: 10px; }
        .highlight-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .urgency-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .pricing-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .pricing-table th, .pricing-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        .price-total { font-size: 28px; font-weight: 800; color: {{ brand.primary_color }}; }
        .cta-btn { display: inline-block; background: {{ brand.primary_color }}; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 30px; font-size: 16px; }
        .footer { margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div class="brand-name">{{ brand.business_name }}</div>
            <div class="badge">🔥 Validez: {{ proposal.scarcity_deadline_days }} Días</div>
        </div>

        <h1>{{ proposal.title }}</h1>
        <p>Preparado exclusivamente para: <strong>{{ lead.name }}</strong> ({{ lead.company or 'Empresa Asociada' }})</p>

        <div class="urgency-box">
            <strong>⚠️ Costo de Inacción Identificado:</strong><br/>
            Se estima que posponer esta implementación representa una fuga potencial de 
            <strong>${{ "%.2f"|format(proposal.inaction_cost) }} {{ brand.currency }} mensuales</strong> en conversiones no capturadas.
        </div>

        <div class="section-title">Alcance del Servicio</div>
        <h3>{{ proposal.service_name }}</h3>
        <p>Implementación e integración de flujos inteligentes para escalar captación, automatizar seguimiento y blindar retención comercial.</p>

        <div class="section-title">Inversión Estratégica</div>
        <table class="pricing-table">
            <thead>
                <tr>
                    <th>Concepto</th>
                    <th style="text-align: right;">Inversión</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>{{ proposal.service_name }} (Setup + Licencia Operativa)</td>
                    <td style="text-align: right;" class="price-total">${{ "%.2f"|format(proposal.price) }} {{ brand.currency }}</td>
                </tr>
            </tbody>
        </table>

        <div style="text-align: center;">
            <a href="mailto:{{ brand.contact_email }}?subject=Acepto Propuesta: {{ proposal.title }}" class="cta-btn">
                Aceptar Propuesta & Reservar Cupo Operativo
            </a>
        </div>

        <img src="/api/proposals/track/{{ proposal.tracking_token }}" width="1" height="1" style="display:none;" />

        <div class="footer">
            Generado automáticamente por ProCRM Intelligent Engine • Fecha: {{ current_date }}
        </div>
    </div>
</body>
</html>
"""

class ProposalEngine:
    @classmethod
    def generate_html(cls, proposal: Any, lead: Any, brand: Any, lang: str = "es") -> str:
        template = Template(HTML_PROPOSAL_TEMPLATE)
        return template.render(
            proposal=proposal,
            lead=lead,
            brand=brand,
            lang=lang,
            current_date=datetime.now().strftime("%Y-%m-%d")
        )
