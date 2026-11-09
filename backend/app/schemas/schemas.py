from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from app.models.entities import LeadStatus, UserRole

class LeadCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: Optional[LeadStatus] = LeadStatus.COLD
    notes: Optional[str] = None

class LeadResponse(BaseModel):
    id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    company: Optional[str]
    status: LeadStatus
    urgency_score: float
    potential_revenue_loss: float
    website: Optional[str]
    linkedin: Optional[str]
    industry: Optional[str]
    company_size: Optional[str]
    enrichment_status: str
    engagement_clicks: int

    class Config:
        from_attributes = True

class CalculatorInput(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    leads_per_month: int
    close_rate_pct: float
    avg_ticket: float
    industry: str

class ProposalCreate(BaseModel):
    lead_id: int
    title: str
    service_name: str
    price: float
    inaction_cost: Optional[float] = 0.0
    scarcity_deadline_days: Optional[int] = 3

class SettingsUpdate(BaseModel):
    business_name: str
    primary_color: str
    secondary_color: str
    currency: str
    contact_email: str
    default_language: str
