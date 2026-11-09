from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, Boolean, Enum as SQLEnum
from datetime import datetime
import enum
from app.core.database import Base

class LeadStatus(str, enum.Enum):
    HOT = "HOT"
    WARM = "WARM"
    COLD = "COLD"
    ACTIVE_CLIENT = "ACTIVE_CLIENT"
    INACTIVE_CLIENT = "INACTIVE_CLIENT"
    PENDING_QUOTE = "PENDING_QUOTE"

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    AGENT = "AGENT"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.AGENT)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Lead(Base):
    __tablename__ = "leads"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, index=True, nullable=True)
    phone = Column(String, nullable=True)
    company = Column(String, nullable=True)
    status = Column(SQLEnum(LeadStatus), default=LeadStatus.COLD)
    urgency_score = Column(Float, default=0.0) # 0 to 100
    potential_revenue_loss = Column(Float, default=0.0)
    source = Column(String, default="manual") # excel, web_calculator, manual
    
    # Forensic Enrichment Fields
    website = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    company_size = Column(String, nullable=True)
    enrichment_status = Column(String, default="PENDING") # PENDING, ENRICHED, FAILED
    
    # Engagement and Reactivation
    last_interaction = Column(DateTime, default=datetime.utcnow)
    reactivation_stage = Column(Integer, default=0) # 0 to 4
    engagement_clicks = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    custom_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Proposal(Base):
    __tablename__ = "proposals"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    service_name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    inaction_cost = Column(Float, default=0.0)
    scarcity_deadline_days = Column(Integer, default=3)
    tracking_token = Column(String, unique=True, index=True)
    views_count = Column(Integer, default=0)
    last_viewed_at = Column(DateTime, nullable=True)
    status = Column(String, default="DRAFT") # DRAFT, SENT, VIEWED, ACCEPTED
    created_at = Column(DateTime, default=datetime.utcnow)

class BusinessSettings(Base):
    __tablename__ = "business_settings"
    id = Column(Integer, primary_key=True)
    business_name = Column(String, default="Mi Negocio Pro")
    primary_color = Column(String, default="#3b82f6")
    secondary_color = Column(String, default="#1e293b")
    logo_url = Column(String, nullable=True)
    default_language = Column(String, default="es")
    currency = Column(String, default="USD")
    contact_email = Column(String, default="soporte@negocio.com")
