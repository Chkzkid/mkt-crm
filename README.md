# ProCRM — Intelligent Sales Engine

Software de alta conversión y gestión comercial con automatizaciones inteligentes y personalización en tiempo real.

## 🚀 Módulos Implementados

1. **Módulo de Migración e Ingesta Inteligente**:
   - Carga y procesado directo de archivos Excel (`.xlsx`, `.xls`) y `.csv`.
   - Limpieza, estandarización de teléfonos y correos, deduplicación y clasificación de estatus (`HOT`, `WARM`, `COLD`, `ACTIVE_CLIENT`, `INACTIVE_CLIENT`, `PENDING_QUOTE`).

2. **Enriquecimiento Forense de la Base Migrada (Data Enrichment)**:
   - Detección automática del sector corporativo, sitio web, LinkedIn institucional y tamaño estimado de la empresa.

3. **Reverse-Intent Funnel (Calculadora Web Inteligente)**:
   - Diagnóstico interactivo que cuantifica la fuga de ingresos mensual (*Revenue Leakage*) y asigna un *Score de Urgencia/Fit* (0 a 100) en tiempo real.

4. **Motor de Reactivación de Leads Fríos**:
   - Secuencia de *Micro-Value Loops* con tracking de clics que dispara alertas automáticas de **Alta Temperatura** cuando un lead frío muestra interés.

5. **Panel de Control Único & Respaldos Soberanos**:
   - Visualización unificada de métricas críticas y lista de **Acciones Prioritarias del Día**.
   - Respaldos automáticos a formatos CSV y JSON listos para sincronizar con Google Drive o disco local sin depender de servicios externos.

6. **Cierre, Propuestas y Escasez Operativa**:
   - Generación instantánea de propuestas dinámicas que anclan el precio contra el costo de no actuar y aplican límite de validez/escasez.
   - Enlace y tracking en vivo de aperturas.

7. **Configuración de Marca Multinegocio y Multilenguaje**:
   - Selector en tiempo real de idioma (Español / Inglés).
   - Personalización inmediata de nombre de empresa, color de marca, moneda y correo de contacto sin reiniciar el sistema.

---

## 💻 Instrucciones de Ejecución

Para iniciar el software, simplemente ejecuta el archivo:
```bash
start.bat
```

O de forma manual en dos terminales:

**Terminal 1 (Backend):**
```bash
cd server
npm start
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Abre en tu navegador:
- **Panel Web**: [http://localhost:5173](http://localhost:5173)
- **API Backend**: [http://localhost:8000](http://localhost:8000)
