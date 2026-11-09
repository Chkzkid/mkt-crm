import express from 'express';
import cors from 'cors';
import multer from 'multer';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// Archivo de persistencia local JSON ultra rápido
const DB_FILE = path.join(__dirname, 'procrm_store.json');
const BACKUPS_DIR = path.join(__dirname, '..', 'backups');

if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch (e) {
      console.error("Error reading DB file, fallback default", e);
    }
  }
  return {
    leads: [],
    proposals: [],
    settings: {
      business_name: 'Mi Negocio Pro',
      primary_color: '#2563eb',
      secondary_color: '#1e293b',
      currency: 'USD',
      contact_email: 'ventas@negocio.com',
      default_language: 'es'
    }
  };
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ----------------- 1. MIGRACIÓN E INGESTA INTELIGENTE -----------------
function cleanPhone(val) {
  if (!val) return '';
  return String(val).replace(/[^\d+]/g, '');
}

function cleanEmail(val) {
  if (!val) return '';
  const s = String(val).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : '';
}

function classifyStatus(status, notes) {
  const s = String(status || '').toLowerCase();
  const n = String(notes || '').toLowerCase();
  if (s.includes('cotiz') || n.includes('cotiz') || s.includes('presupuesto')) return 'PENDING_QUOTE';
  if (s.includes('activ') || s.includes('compr') || n.includes('compr')) return 'ACTIVE_CLIENT';
  if (s.includes('inactiv') || s.includes('pausa')) return 'INACTIVE_CLIENT';
  if (s.includes('caliente') || s.includes('hot')) return 'HOT';
  if (s.includes('tibio') || s.includes('warm')) return 'WARM';
  return 'COLD';
}

app.post('/api/ingest/file', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

  const db = loadDB();
  const seen = new Set(db.leads.map(l => (l.email || l.phone || l.name).toLowerCase()));
  let added = 0;

  for (const r of rows) {
    const keys = Object.keys(r);
    let name = '', email = '', phone = '', company = '', rawStatus = '', notes = '';

    for (const k of keys) {
      const lower = k.toLowerCase();
      if (lower.includes('nombre') || lower.includes('name') || lower.includes('contacto')) name = r[k];
      else if (lower.includes('email') || lower.includes('correo') || lower.includes('mail')) email = r[k];
      else if (lower.includes('tel') || lower.includes('phone') || lower.includes('cel') || lower.includes('whatsapp')) phone = r[k];
      else if (lower.includes('empresa') || lower.includes('company') || lower.includes('negocio')) company = r[k];
      else if (lower.includes('status') || lower.includes('estado')) rawStatus = r[k];
      else if (lower.includes('nota') || lower.includes('comentario')) notes = r[k];
    }

    const cEmail = cleanEmail(email);
    const cPhone = cleanPhone(phone);
    const dedupKey = (cEmail || cPhone || name).toLowerCase();

    if (!dedupKey || seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    db.leads.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      name: String(name || 'Lead Importado').trim(),
      email: cEmail,
      phone: cPhone,
      company: String(company || '').trim(),
      status: classifyStatus(rawStatus, notes),
      urgency_score: 30,
      potential_revenue_loss: 0,
      source: 'excel_import',
      website: '',
      linkedin: '',
      industry: 'Servicios Profesionales',
      company_size: '5-25 empleados',
      enrichment_status: 'PENDING',
      reactivation_stage: 0,
      engagement_clicks: 0,
      created_at: new Date().toISOString()
    });
    added++;
  }

  saveDB(db);
  res.json({
    status: 'SUCCESS',
    total_rows: rows.length,
    imported_unique_leads: added,
    message: `Se importaron ${added} registros únicos exitosamente.`
  });
});

// ----------------- 2. ENRIQUECIMIENTO FORENSE -----------------
function enrichCompanyData(companyName, email) {
  let domain = '';
  if (email && email.includes('@')) {
    domain = email.split('@')[1];
  }
  const name = companyName || (domain ? domain.split('.')[0] : 'Empresa');
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');

  let industry = 'Servicios B2B';
  let company_size = '10-50 colaboradores';

  const n = name.toLowerCase();
  if (n.includes('tech') || n.includes('soft') || n.includes('app') || n.includes('digital')) {
    industry = 'Tecnología / Software';
    company_size = '15-60 colaboradores';
  } else if (n.includes('mkt') || n.includes('media') || n.includes('agency')) {
    industry = 'Marketing & Publicidad';
    company_size = '5-20 colaboradores';
  } else if (n.includes('salud') || n.includes('med') || n.includes('clinic')) {
    industry = 'Salud & Bienestar';
    company_size = '10-30 colaboradores';
  }

  return {
    enrichment_status: 'ENRICHED',
    website: `https://www.${slug}.com`,
    linkedin: `https://www.linkedin.com/company/${slug}`,
    industry,
    company_size
  };
}

app.post('/api/enrich/lead/:id', (req, res) => {
  const db = loadDB();
  const lead = db.leads.find(l => l.id == req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });

  const enriched = enrichCompanyData(lead.company, lead.email);
  Object.assign(lead, enriched);
  saveDB(db);
  res.json({ status: 'SUCCESS', enriched_data: enriched });
});

app.post('/api/enrich/batch-all-pending', (req, res) => {
  const db = loadDB();
  let count = 0;
  for (const lead of db.leads) {
    if (lead.enrichment_status === 'PENDING') {
      const enriched = enrichCompanyData(lead.company, lead.email);
      Object.assign(lead, enriched);
      count++;
    }
  }
  saveDB(db);
  res.json({ status: 'SUCCESS', enriched_count: count });
});

// ----------------- 3. REVERSE-INTENT FUNNEL (CALCULADORA) -----------------
app.post('/api/calculator/submit', (req, res) => {
  const { name, email, phone, company, leads_per_month, close_rate_pct, avg_ticket, industry } = req.body;
  const lostLeads = Number(leads_per_month) * (1 - (Number(close_rate_pct) / 100));
  const revenueLeak = Math.round(lostLeads * Number(avg_ticket));

  let score = 25;
  if (avg_ticket >= 5000) score += 30;
  else if (avg_ticket >= 1500) score += 15;

  if (leads_per_month >= 100) score += 25;
  else if (leads_per_month >= 30) score += 15;

  if (close_rate_pct < 20) score += 20;

  score = Math.min(100, score);
  const classification = score >= 75 ? 'HOT' : score >= 45 ? 'WARM' : 'COLD';

  const db = loadDB();
  const newLead = {
    id: Date.now(),
    name,
    email: cleanEmail(email),
    phone: cleanPhone(phone),
    company: company || '',
    status: classification,
    urgency_score: score,
    potential_revenue_loss: revenueLeak,
    source: 'web_calculator',
    website: '',
    linkedin: '',
    industry: industry || 'Consultoría / Servicios',
    company_size: 'Calculado Online',
    enrichment_status: 'ENRICHED',
    reactivation_stage: 0,
    engagement_clicks: 0,
    created_at: new Date().toISOString()
  };

  db.leads.unshift(newLead);
  saveDB(db);

  res.json({
    lead_id: newLead.id,
    urgency_score: score,
    monthly_revenue_leak: revenueLeak,
    classification
  });
});

// ----------------- 4. MOTOR DE REACTIVACIÓN -----------------
app.post('/api/reactivation/trigger-step/:id', (req, res) => {
  const db = loadDB();
  const lead = db.leads.find(l => l.id == req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });

  lead.reactivation_stage = (lead.reactivation_stage || 0) + 1;
  saveDB(db);
  res.json({ status: 'SUCCESS', new_stage: lead.reactivation_stage });
});

app.get('/api/reactivation/track-click/:id', (req, res) => {
  const db = loadDB();
  const lead = db.leads.find(l => l.id == req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });

  lead.engagement_clicks = (lead.engagement_clicks || 0) + 1;
  lead.urgency_score = Math.min(100, (lead.urgency_score || 20) + 25);
  lead.status = 'HOT';
  saveDB(db);
  res.json({ alert: 'ALTA_TEMPERATURA', lead });
});

// ----------------- 5. DASHBOARD & BACKUPS -----------------
app.get('/api/dashboard/summary', (req, res) => {
  const db = loadDB();
  const leads = db.leads;

  const counts = {
    HOT: leads.filter(l => l.status === 'HOT').length,
    WARM: leads.filter(l => l.status === 'WARM').length,
    COLD: leads.filter(l => l.status === 'COLD').length,
    ACTIVE_CLIENT: leads.filter(l => l.status === 'ACTIVE_CLIENT').length,
    INACTIVE_CLIENT: leads.filter(l => l.status === 'INACTIVE_CLIENT').length,
    PENDING_QUOTE: leads.filter(l => l.status === 'PENDING_QUOTE').length,
    TOTAL: leads.length
  };

  const priorityLeads = [...leads]
    .sort((a, b) => b.urgency_score - a.urgency_score)
    .slice(0, 5)
    .map(l => ({
      id: l.id,
      name: l.name,
      company: l.company,
      urgency_score: l.urgency_score,
      potential_loss: l.potential_revenue_loss
    }));

  res.json({ stats: counts, priority_actions: priorityLeads });
});

app.get('/api/leads', (req, res) => {
  const db = loadDB();
  res.json(db.leads);
});

app.post('/api/backup/trigger', (req, res) => {
  const db = loadDB();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(BACKUPS_DIR, `procrm_backup_${timestamp}.json`);
  const csvPath = path.join(BACKUPS_DIR, `leads_export_${timestamp}.csv`);

  fs.writeFileSync(jsonPath, JSON.stringify(db, null, 2), 'utf-8');

  // CSV
  if (db.leads.length > 0) {
    const ws = XLSX.utils.json_to_sheet(db.leads);
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    fs.writeFileSync(csvPath, csvContent, 'utf-8');
  }

  res.json({
    status: 'SUCCESS',
    json_path: jsonPath,
    csv_path: csvPath
  });
});

// ----------------- 6. PROPUESTAS Y ESCASEZ -----------------
app.post('/api/proposals/create', (req, res) => {
  const { lead_id, title, service_name, price, inaction_cost, scarcity_deadline_days } = req.body;
  const db = loadDB();
  const token = 'prop_' + Date.now();
  const proposal = {
    id: Date.now(),
    lead_id,
    title,
    service_name,
    price: Number(price),
    inaction_cost: Number(inaction_cost || 0),
    scarcity_deadline_days: Number(scarcity_deadline_days || 3),
    tracking_token: token,
    views_count: 0,
    created_at: new Date().toISOString()
  };

  db.proposals.push(proposal);
  saveDB(db);
  res.json(proposal);
});

app.get('/api/proposals/view/:id', (req, res) => {
  const db = loadDB();
  const prop = db.proposals.find(p => p.id == req.params.id);
  if (!prop) return res.status(404).send('Propuesta no encontrada');

  const lead = db.leads.find(l => l.id == prop.lead_id) || { name: 'Cliente Estimado', company: '' };
  const brand = db.settings;

  // Registrar vista en vivo
  prop.views_count = (prop.views_count || 0) + 1;
  saveDB(db);

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <title>${prop.title}</title>
    <style>
      body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; margin: 0; }
      .card { max-width: 750px; margin: auto; background: #1e293b; border-radius: 16px; padding: 40px; border-top: 8px solid ${brand.primary_color}; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 20px; }
      .badge { background: #7f1d1d; color: #fca5a5; padding: 6px 14px; border-radius: 999px; font-weight: bold; font-size: 13px; }
      .urgency { background: #450a0a; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin: 24px 0; }
      .cta { display: block; text-align: center; background: ${brand.primary_color}; color: white; padding: 16px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 18px; margin-top: 30px; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <h2 style="margin:0; color:${brand.primary_color};">${brand.business_name}</h2>
        <div class="badge">🔥 Cupo Limitado: ${prop.scarcity_deadline_days} Días de Validez</div>
      </div>
      <h1>${prop.title}</h1>
      <p style="color:#94a3b8;">Propuesta estratégica elaborada para <strong>${lead.name}</strong> (${lead.company || 'Empresa'})</p>

      <div class="urgency">
        <strong>⚠️ Costo de Inacción Cuantificado:</strong><br/>
        Mantener los procesos comerciales actuales representa una fuga potencial de 
        <span style="color:#f87171; font-weight:bold;">$${Number(prop.inaction_cost).toLocaleString()} ${brand.currency}</span> mensuales en ventas no capturadas.
      </div>

      <h3>Alcance de la Solución: ${prop.service_name}</h3>
      <p style="color:#cbd5e1; line-height: 1.6;">Despliegue integral de infraestructura comercial automatizada para maximizar conversiones y blindar seguimiento sistemático.</p>

      <div style="background:#0f172a; padding: 20px; border-radius: 10px; margin-top: 24px; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size: 18px;">Inversión Estratégica:</span>
        <span style="font-size: 32px; font-weight:900; color:${brand.primary_color};">$${Number(prop.price).toLocaleString()} ${brand.currency}</span>
      </div>

      <a href="mailto:${brand.contact_email}?subject=Acepto Propuesta: ${encodeURIComponent(prop.title)}" class="cta">
        Aceptar Propuesta & Activar Proyecto
      </a>
      <p style="text-align:center; font-size: 12px; color:#64748b; margin-top: 20px;">Vistas registradas en tiempo real: ${prop.views_count}</p>
    </div>
  </body>
  </html>
  `;
  res.send(html);
});

// ----------------- CONFIGURACIÓN EDITABLE -----------------
app.get('/api/settings', (req, res) => {
  const db = loadDB();
  res.json(db.settings);
});

app.put('/api/settings', (req, res) => {
  const db = loadDB();
  db.settings = { ...db.settings, ...req.body };
  saveDB(db);
  res.json(db.settings);
});

// Servir archivos estáticos del frontend de producción
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ProCRM Engine Backend corriendo en http://0.0.0.0:${PORT}`);
});

