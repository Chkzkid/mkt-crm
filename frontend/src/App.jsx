import React, { useState, useEffect } from 'react';
import { translations } from './i18n/translations';
import { 
  BarChart3, Users, Calculator, FileText, Settings, Upload, 
  Sparkles, ShieldCheck, ArrowRight, Flame, Clock, TrendingUp, CheckCircle, RefreshCw 
} from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState('es');
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState('dashboard');

  // App State
  const [summary, setSummary] = useState(null);
  const [leads, setLeads] = useState([]);
  const [brandSettings, setBrandSettings] = useState({
    business_name: 'Mi Negocio Pro',
    primary_color: '#2563eb',
    secondary_color: '#1e293b',
    currency: 'USD',
    contact_email: 'ventas@negocio.com',
    default_language: 'es'
  });

  // Calculator Form State
  const [calcForm, setCalcForm] = useState({
    name: '', email: '', phone: '', company: '',
    leads_per_month: 50, close_rate_pct: 10, avg_ticket: 2500, industry: 'Tecnología'
  });
  const [calcResult, setCalcResult] = useState(null);

  // Proposal Form State
  const [propForm, setPropForm] = useState({
    lead_id: '', title: 'Propuesta de Aceleración Comercial', service_name: 'Implementación CRM & Funnels',
    price: 3500, inaction_cost: 15000, scarcity_deadline_days: 3
  });
  const [createdProposalId, setCreatedProposalId] = useState(null);

  // Status message
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard/summary');
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setBrandSettings(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchLeads();
    fetchSettings();
  }, []);

  // Handlers
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/ingest/file', { method: 'POST', body: formData });
      const data = await res.json();
      showToast(data.message || 'Archivo procesado con éxito');
      fetchDashboard();
      fetchLeads();
    } catch (err) {
      showToast('Error subiendo archivo');
    }
  };

  const handleEnrichAll = async () => {
    try {
      showToast('Iniciando enriquecimiento forense en segundo plano...');
      const res = await fetch('/api/enrich/batch-all-pending', { method: 'POST' });
      const data = await res.json();
      showToast(`Enriquecimiento completado: ${data.enriched_count} registros.`);
      fetchLeads();
    } catch (err) {
      showToast('Error al enriquecer');
    }
  };

  const handleBackup = async () => {
    try {
      const res = await fetch('/api/backup/trigger', { method: 'POST' });
      const data = await res.json();
      showToast(`Respaldo generado en: ${data.csv_path}`);
    } catch (err) {
      showToast('Error creando backup');
    }
  };

  const handleCalcSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/calculator/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calcForm)
      });
      const data = await res.json();
      setCalcResult(data);
      showToast(`Score generado: ${data.urgency_score} pts | Lead ${data.classification}`);
      fetchDashboard();
      fetchLeads();
    } catch (err) {
      showToast('Error en cálculo');
    }
  };

  const handleProposalSubmit = async (e) => {
    e.preventDefault();
    if (!propForm.lead_id) {
      showToast('Selecciona un lead');
      return;
    }
    try {
      const res = await fetch('/api/proposals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propForm)
      });
      const data = await res.json();
      setCreatedProposalId(data.id);
      showToast('Propuesta generada con éxito');
    } catch (err) {
      showToast('Error creando propuesta');
    }
  };

  const handleSettingsSave = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandSettings)
      });
      showToast('Configuraciones de negocio guardadas');
    } catch (err) {
      showToast('Error guardando configuración');
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-100">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col justify-between p-4">
        <div>
          <div className="flex items-center gap-3 px-2 py-4 border-b border-slate-800">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white shadow-lg"
                 style={{ backgroundColor: brandSettings.primary_color }}>
              PRO
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-white">{brandSettings.business_name}</h1>
              <p className="text-xs text-slate-400">Intelligent CRM</p>
            </div>
          </div>

          <nav className="mt-6 space-y-1">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <BarChart3 className="w-4 h-4" /> {t.dashboard}
            </button>
            <button 
              onClick={() => setActiveTab('leads')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'leads' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Users className="w-4 h-4" /> {t.leads}
            </button>
            <button 
              onClick={() => setActiveTab('calculator')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'calculator' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Calculator className="w-4 h-4" /> {t.calculator}
            </button>
            <button 
              onClick={() => setActiveTab('proposals')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'proposals' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <FileText className="w-4 h-4" /> {t.proposals}
            </button>
            <button 
              onClick={() => setActiveTab('settings')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Settings className="w-4 h-4" /> {t.settings}
            </button>
          </nav>
        </div>

        {/* Language switcher & status */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 px-2 mb-2">
            <span>Idioma / Lang</span>
            <div className="flex gap-1">
              <button onClick={() => setLang('es')} className={`px-2 py-0.5 rounded font-bold ${lang === 'es' ? 'bg-blue-600 text-white' : 'bg-slate-800'}`}>ES</button>
              <button onClick={() => setLang('en')} className={`px-2 py-0.5 rounded font-bold ${lang === 'en' ? 'bg-blue-600 text-white' : 'bg-slate-800'}`}>EN</button>
            </div>
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 px-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Sistema en Tiempo Real
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-8">
        {toast && (
          <div className="mb-6 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between animate-fade-in">
            <span>{toast}</span>
            <button onClick={() => setToast('')} className="text-xs font-bold uppercase underline">Cerrar</button>
          </div>
        )}

        {/* TAB: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold">{t.dashboard}</h2>
                <p className="text-slate-400 text-sm">Resumen unificado y acciones críticas prioritarias.</p>
              </div>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg cursor-pointer text-sm font-medium border border-slate-700 transition">
                  <Upload className="w-4 h-4 text-blue-400" />
                  <span>{t.import_excel}</span>
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
                </label>
                <button onClick={handleEnrichAll} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium transition shadow-md">
                  <Sparkles className="w-4 h-4" /> {t.enrich_all}
                </button>
                <button onClick={handleBackup} className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 px-4 py-2 rounded-lg text-sm font-medium transition">
                  <ShieldCheck className="w-4 h-4" /> {t.run_backup}
                </button>
              </div>
            </div>

            {/* METRICS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl">
                <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase">
                  <span>{t.hot_leads}</span>
                  <Flame className="w-4 h-4 text-red-500" />
                </div>
                <div className="text-3xl font-extrabold mt-2 text-red-400">
                  {summary ? summary.stats.HOT : 0}
                </div>
                <p className="text-xs text-slate-400 mt-1">Cierre inminente / alta urgencia</p>
              </div>

              <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl">
                <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase">
                  <span>{t.warm_leads}</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-extrabold mt-2 text-amber-400">
                  {summary ? summary.stats.WARM : 0}
                </div>
                <p className="text-xs text-slate-400 mt-1">En ciclo de maduración</p>
              </div>

              <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl">
                <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase">
                  <span>{t.cold_leads}</span>
                  <RefreshCw className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-3xl font-extrabold mt-2 text-cyan-400">
                  {summary ? summary.stats.COLD : 0}
                </div>
                <p className="text-xs text-slate-400 mt-1">Listos para Micro-Value Loops</p>
              </div>

              <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl">
                <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase">
                  <span>{t.active_clients}</span>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-extrabold mt-2 text-emerald-400">
                  {summary ? summary.stats.ACTIVE_CLIENT : 0}
                </div>
                <p className="text-xs text-slate-400 mt-1">Cuentas activas en la base</p>
              </div>
            </div>

            {/* ACCIONES PRIORITARIAS DEL DÍA */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-500" /> {t.priority_actions}
              </h3>
              {summary && summary.priority_actions.length > 0 ? (
                <div className="space-y-3">
                  {summary.priority_actions.map((act) => (
                    <div key={act.id} className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700 hover:border-slate-600 transition">
                      <div>
                        <div className="font-semibold text-white">{act.name} <span className="text-xs text-slate-400">({act.company || 'Sin empresa'})</span></div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Fuga estimada: <span className="text-red-400 font-bold">${act.potential_loss} {brandSettings.currency}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-bold px-2.5 py-1 rounded bg-red-950 text-red-300 border border-red-800">
                          Score {act.urgency_score}
                        </span>
                        <button 
                          onClick={() => {
                            setPropForm({ ...propForm, lead_id: act.id, inaction_cost: act.potential_loss || 5000 });
                            setActiveTab('proposals');
                          }}
                          className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition">
                          {t.new_proposal} <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm py-4">No hay acciones urgentes pendientes. ¡Buen trabajo!</p>
              )}
            </div>
          </div>
        )}

        {/* TAB: LEADS DATABASE */}
        {activeTab === 'leads' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">{t.leads}</h2>
                <p className="text-slate-400 text-sm">Visualización forense de registros, scoring y automatización.</p>
              </div>
              <button onClick={fetchLeads} className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-700">
                Refrescar
              </button>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-700">
                  <tr>
                    <th className="p-4">Lead / Contacto</th>
                    <th className="p-4">Empresa / Datos Forenses</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4">Score Urgencia</th>
                    <th className="p-4">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {leads.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-750 transition">
                      <td className="p-4">
                        <div className="font-semibold text-white">{l.name}</div>
                        <div className="text-xs text-slate-400">{l.email || l.phone || 'Sin contacto'}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-white font-medium">{l.company || '-'}</div>
                        {l.industry && (
                          <div className="text-xs text-indigo-400">{l.industry} • {l.company_size}</div>
                        )}
                        {l.website && (
                          <a href={l.website} target="_blank" rel="noreferrer" className="text-xs text-blue-400 underline block mt-0.5">
                            {l.website}
                          </a>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                          l.status === 'HOT' ? 'bg-red-950 text-red-300 border border-red-800' :
                          l.status === 'WARM' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          l.status === 'ACTIVE_CLIENT' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                          'bg-slate-900 text-slate-300 border border-slate-700'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-blue-400">
                        {l.urgency_score} / 100
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={async () => {
                              await fetch(`/api/enrich/lead/${l.id}`, { method: 'POST' });
                              showToast(`Lead ${l.name} enriquecido`);
                              fetchLeads();
                            }}
                            className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition text-indigo-300">
                            Enriquecer
                          </button>
                          <button 
                            onClick={async () => {
                              await fetch(`/api/reactivation/trigger-step/${l.id}`, { method: 'POST' });
                              showToast(`Etapa de reactivación avanzada para ${l.name}`);
                              fetchLeads();
                            }}
                            className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition text-emerald-300">
                            Reactivar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {leads.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-400">
                        No hay leads registrados aún. Importa un archivo Excel o usa la calculadora.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: CALCULADORA WEB / REVERSE-INTENT */}
        {activeTab === 'calculator' && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-white">Calculadora de Fuga de Ingresos</h2>
              <p className="text-slate-400 mt-2 text-sm">Reverse-Intent Funnel: califica y clasifica prospectos en tiempo real.</p>
            </div>

            <form onSubmit={handleCalcSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-8 space-y-6 shadow-2xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo</label>
                  <input required type="text" value={calcForm.name} onChange={e => setCalcForm({...calcForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-blue-500" placeholder="Ej. Roberto Gómez" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email de Contacto</label>
                  <input required type="email" value={calcForm.email} onChange={e => setCalcForm({...calcForm, email: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-blue-500" placeholder="roberto@empresa.com" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Teléfono / WhatsApp</label>
                  <input type="text" value={calcForm.phone} onChange={e => setCalcForm({...calcForm, phone: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-blue-500" placeholder="+52 55..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Empresa / Marca</label>
                  <input type="text" value={calcForm.company} onChange={e => setCalcForm({...calcForm, company: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-blue-500" placeholder="Acme Inc" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Leads o Contactos al Mes: <span className="font-bold text-blue-400">{calcForm.leads_per_month}</span>
                </label>
                <input type="range" min="5" max="500" step="5" value={calcForm.leads_per_month} onChange={e => setCalcForm({...calcForm, leads_per_month: Number(e.target.value)})} className="w-full" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tasa de Cierre Actual (%): <span className="font-bold text-amber-400">{calcForm.close_rate_pct}%</span>
                </label>
                <input type="range" min="1" max="50" step="1" value={calcForm.close_rate_pct} onChange={e => setCalcForm({...calcForm, close_rate_pct: Number(e.target.value)})} className="w-full" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ticket Promedio por Cliente (${brandSettings.currency})</label>
                <input type="number" value={calcForm.avg_ticket} onChange={e => setCalcForm({...calcForm, avg_ticket: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-blue-500" />
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-bold py-3 rounded-lg text-white shadow-lg transition flex items-center justify-center gap-2">
                <TrendingUp className="w-5 h-5" /> {t.calculate_urgency}
              </button>
            </form>

            {calcResult && (
              <div className="mt-8 bg-slate-800 border-2 border-red-500 rounded-xl p-6 shadow-2xl animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white">Resultado del Diagnóstico</h3>
                    <p className="text-sm text-slate-300">Clasificación: <strong className="text-red-400">{calcResult.classification}</strong></p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase font-bold">Urgency Fit Score</div>
                    <div className="text-3xl font-extrabold text-blue-400">{calcResult.urgency_score} / 100</div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400">Fuga de Dinero Mensual Estimada:</div>
                  <div className="text-3xl font-black text-red-400 mt-1">
                    ${calcResult.monthly_revenue_leak.toLocaleString()} {brandSettings.currency} / mes
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: PROPUESTAS Y ESCASEZ */}
        {activeTab === 'proposals' && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-white">{t.new_proposal}</h2>
              <p className="text-slate-400 mt-2 text-sm">Ancla el precio contra el costo de inacción y activa escasez operativa.</p>
            </div>

            <form onSubmit={handleProposalSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-8 space-y-5 shadow-2xl">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Seleccionar Lead</label>
                <select 
                  value={propForm.lead_id} 
                  onChange={e => setPropForm({...propForm, lead_id: Number(e.target.value)})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-blue-500">
                  <option value="">-- Elige un lead --</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.company || 'Sin Empresa'}) - Score: {l.urgency_score}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Título de la Propuesta</label>
                <input type="text" value={propForm.title} onChange={e => setPropForm({...propForm, title: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Servicio / Solución</label>
                <input type="text" value={propForm.service_name} onChange={e => setPropForm({...propForm, service_name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Inversión (${brandSettings.currency})</label>
                  <input type="number" value={propForm.price} onChange={e => setPropForm({...propForm, price: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Costo de Inacción (${brandSettings.currency})</label>
                  <input type="number" value={propForm.inaction_cost} onChange={e => setPropForm({...propForm, inaction_cost: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Validez de Escasez Operativa (Días)</label>
                <input type="number" min="1" max="15" value={propForm.scarcity_deadline_days} onChange={e => setPropForm({...propForm, scarcity_deadline_days: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-blue-500" />
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-bold py-3 rounded-lg text-white shadow-lg transition">
                Generar Propuesta con Tracking
              </button>
            </form>

            {createdProposalId && (
              <div className="mt-6 p-4 bg-emerald-950 border border-emerald-700 rounded-xl text-center">
                <p className="text-emerald-300 text-sm font-semibold mb-2">¡Propuesta generada con enlace rastreable!</p>
                <a 
                  href={`/api/proposals/view/${createdProposalId}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-sm transition">
                  <FileText className="w-4 h-4" /> Ver Propuesta en Tiempo Real
                </a>
              </div>
            )}
          </div>
        )}

        {/* TAB: BRAND SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">{t.settings}</h2>
              <p className="text-slate-400 text-sm">Personaliza el CRM para tu negocio o equipo de trabajo.</p>
            </div>

            <form onSubmit={handleSettingsSave} className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.business_name}</label>
                <input type="text" value={brandSettings.business_name} onChange={e => setBrandSettings({...brandSettings, business_name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t.primary_color}</label>
                  <input type="color" value={brandSettings.primary_color} onChange={e => setBrandSettings({...brandSettings, primary_color: e.target.value})} className="w-full h-10 bg-slate-900 border border-slate-700 rounded-lg p-1 cursor-pointer" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t.currency}</label>
                  <input type="text" value={brandSettings.currency} onChange={e => setBrandSettings({...brandSettings, currency: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.contact_email}</label>
                <input type="email" value={brandSettings.contact_email} onChange={e => setBrandSettings({...brandSettings, contact_email: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white" />
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-bold py-2.5 rounded-lg text-white transition">
                {t.save}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
