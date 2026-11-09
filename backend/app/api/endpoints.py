import io
import uuid
import pandas as pd
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.database import get_db
from app.models.entities import Lead, Proposal, BusinessSettings, LeadStatus
from app.schemas.schemas import LeadCreate, LeadResponse, CalculatorInput, ProposalCreate, SettingsUpdate
from app.services.ingest_service import IngestService
from app.services.enrichment_service import EnrichmentService
from app.services.scoring_service import ScoringService
from app.services.reactivation_service import ReactivationEngine
from app.services.backup_service import BackupService
from app.services.proposal_service import ProposalEngine

router = APIRouter()

# ----------------- 1. INGESTA -----------------
@router.post("/ingest/file")
async def ingest_file(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    content = await file.read()
    filename = file.filename.lower()
    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        elif filename.endswith((".xls", ".xlsx")):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Formato no soportado. Usa CSV o Excel.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error leyendo archivo: {str(e)}")

    processed_data = IngestService.process_dataframe(df)
    imported_count = 0
    for item in processed_data:
        lead = Lead(**item)
        db.add(lead)
        imported_count += 1
    
    await db.commit()
    return {
        "status": "SUCCESS",
        "total_rows_file": len(df),
        "imported_unique_leads": imported_count,
        "message": f"Se procesaron {imported_count} leads únicos y limpios."
    }

# ----------------- 2. ENRIQUECIMIENTO FORENSE -----------------
@router.post("/enrich/lead/{lead_id}")
async def enrich_lead(lead_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")

    enrich_data = await EnrichmentService.enrich_company(lead.company or "", lead.email or "")
    for k, v in enrich_data.items():
        setattr(lead, k, v)
    
    await db.commit()
    await db.refresh(lead)
    return {"status": "SUCCESS", "enriched_data": enrich_data}

@router.post("/enrich/batch-all-pending")
async def enrich_all_pending(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead).where(Lead.enrichment_status == "PENDING"))
    leads = result.scalars().all()
    count = 0
    for l in leads:
        data = await EnrichmentService.enrich_company(l.company or "", l.email or "")
        for k, v in data.items():
            setattr(l, k, v)
        count += 1
    await db.commit()
    return {"status": "SUCCESS", "enriched_count": count}

# ----------------- 3. REVERSE-INTENT FUNNEL (CALCULADORA) -----------------
@router.post("/calculator/submit")
async def submit_calculator(input_data: CalculatorInput, db: AsyncSession = Depends(get_db)):
    score_res = ScoringService.calculate_urgency_and_fit(
        leads_per_month=input_data.leads_per_month,
        close_rate_pct=input_data.close_rate_pct,
        avg_ticket=input_data.avg_ticket,
        industry=input_data.industry,
        corporate_email=not any(domain in input_data.email for domain in ["gmail.com", "hotmail.com", "yahoo.com"])
    )

    lead = Lead(
        name=input_data.name,
        email=input_data.email,
        phone=input_data.phone,
        company=input_data.company,
        status=score_res["classification"],
        urgency_score=score_res["urgency_score"],
        potential_revenue_loss=score_res["monthly_revenue_leak"],
        industry=input_data.industry,
        source="web_calculator"
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)

    return {
        "lead_id": lead.id,
        "urgency_score": score_res["urgency_score"],
        "monthly_revenue_leak": score_res["monthly_revenue_leak"],
        "classification": score_res["classification"],
        "message": "Diagnóstico generado correctamente."
    }

# ----------------- 4. REACTIVACIÓN & MICRO-LOOPS -----------------
@router.get("/reactivation/candidates")
async def get_reactivation_candidates(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead).where(Lead.status.in_([LeadStatus.COLD, LeadStatus.INACTIVE_CLIENT])))
    leads = result.scalars().all()
    candidates = []
    for l in leads:
        step = ReactivationEngine.get_next_step(l.reactivation_stage or 0)
        if step:
            candidates.append({"lead_id": l.id, "name": l.name, "email": l.email, "next_step": step})
    return candidates

@router.post("/reactivation/trigger-step/{lead_id}")
async def trigger_reactivation_step(lead_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    
    lead.reactivation_stage = (lead.reactivation_stage or 0) + 1
    await db.commit()
    return {"status": "SUCCESS", "new_stage": lead.reactivation_stage}

@router.get("/reactivation/track-click/{lead_id}")
async def track_reactivation_click(lead_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    
    alert_info = ReactivationEngine.process_click_alert(lead)
    await db.commit()
    return alert_info

# ----------------- 5. DASHBOARD & BACKUPS -----------------
@router.get("/dashboard/summary")
async def get_dashboard_summary(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead))
    leads = result.scalars().all()

    counts = {
        "HOT": len([l for l in leads if l.status == LeadStatus.HOT]),
        "WARM": len([l for l in leads if l.status == LeadStatus.WARM]),
        "COLD": len([l for l in leads if l.status == LeadStatus.COLD]),
        "ACTIVE_CLIENT": len([l for l in leads if l.status == LeadStatus.ACTIVE_CLIENT]),
        "INACTIVE_CLIENT": len([l for l in leads if l.status == LeadStatus.INACTIVE_CLIENT]),
        "PENDING_QUOTE": len([l for l in leads if l.status == LeadStatus.PENDING_QUOTE]),
        "TOTAL": len(leads)
    }

    # Acciones prioritarias del día (Leads HOT o con alta pérdida)
    priority_leads = sorted([l for l in leads if l.urgency_score >= 50 or l.status == LeadStatus.HOT], 
                            key=lambda x: x.urgency_score, reverse=True)[:5]
    
    return {
        "stats": counts,
        "priority_actions": [
            {
                "id": l.id,
                "name": l.name,
                "company": l.company,
                "urgency_score": l.urgency_score,
                "potential_loss": l.potential_revenue_loss,
                "recommendation": f"Contactar hoy ({'Propuesta urgente' if l.urgency_score > 75 else 'Seguimiento'})"
            } for l in priority_leads
        ]
    }

@router.get("/leads")
async def list_leads(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead).order_by(desc(Lead.urgency_score), desc(Lead.id)))
    leads = result.scalars().all()
    return leads

@router.post("/leads")
async def create_lead(payload: LeadCreate, db: AsyncSession = Depends(get_db)):
    lead = Lead(**payload.dict())
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return lead

@router.post("/backup/trigger")
async def trigger_backup(db: AsyncSession = Depends(get_db)):
    leads_res = await db.execute(select(Lead))
    users_res = await db.execute(select(BusinessSettings))
    props_res = await db.execute(select(Proposal))
    
    leads_dicts = [
        {"id": l.id, "name": l.name, "email": l.email, "phone": l.phone, "company": l.company, 
         "status": str(l.status), "urgency_score": l.urgency_score, "loss": l.potential_revenue_loss} 
        for l in leads_res.scalars().all()
    ]
    backup_meta = BackupService.create_local_backup(leads_dicts, [], [])
    return backup_meta

# ----------------- 6. PROPUESTAS & TRACKING -----------------
@router.post("/proposals/create")
async def create_proposal(payload: ProposalCreate, db: AsyncSession = Depends(get_db)):
    token = str(uuid.uuid4())
    proposal = Proposal(
        lead_id=payload.lead_id,
        title=payload.title,
        service_name=payload.service_name,
        price=payload.price,
        inaction_cost=payload.inaction_cost,
        scarcity_deadline_days=payload.scarcity_deadline_days,
        tracking_token=token
    )
    db.add(proposal)
    await db.commit()
    await db.refresh(proposal)
    return proposal

@router.get("/proposals/view/{proposal_id}", response_class=HTMLResponse)
async def view_proposal(proposal_id: int, lang: str = "es", db: AsyncSession = Depends(get_db)):
    prop_res = await db.execute(select(Proposal).where(Proposal.id == proposal_id))
    proposal = prop_res.scalars().first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Propuesta no encontrada")

    lead_res = await db.execute(select(Lead).where(Lead.id == proposal.lead_id))
    lead = lead_res.scalars().first()
    
    brand_res = await db.execute(select(BusinessSettings))
    brand = brand_res.scalars().first()
    if not brand:
        brand = BusinessSettings()

    html = ProposalEngine.generate_html(proposal, lead, brand, lang=lang)
    return HTMLResponse(content=html)

@router.get("/proposals/track/{token}")
async def track_proposal_pixel(token: str, db: AsyncSession = Depends(get_db)):
    prop_res = await db.execute(select(Proposal).where(Proposal.tracking_token == token))
    proposal = prop_res.scalars().first()
    if proposal:
        proposal.views_count = (proposal.views_count or 0) + 1
        proposal.last_viewed_at = func.now()
        proposal.status = "VIEWED"
        await db.commit()
    
    # 1x1 GIF transparente
    pixel = b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;'
    return Response(content=pixel, media_type="image/gif")

# ----------------- BRANDING & AJUSTES -----------------
@router.get("/settings")
async def get_settings(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(BusinessSettings))
    b = res.scalars().first()
    if not b:
        b = BusinessSettings()
        db.add(b)
        await db.commit()
        await db.refresh(b)
    return b

@router.put("/settings")
async def update_settings(payload: SettingsUpdate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(BusinessSettings))
    b = res.scalars().first()
    if not b:
        b = BusinessSettings()
        db.add(b)
    for k, v in payload.dict().items():
        setattr(b, k, v)
    await db.commit()
    return b
