# Deployment Guide: Desplegar ProCRM en la Web (URL Pública Gratuita 24/7)

Para que cualquier persona pueda entrar con un link desde cualquier lugar del mundo (sin depender de que tu computadora personal esté encendida), las dos plataformas más rápidas y gratuitas son **Render** y **Railway**.

---

## 🌟 Opción 1: Despliegue en Render (100% Gratis y en 3 pasos)

1. **Sube tu carpeta a GitHub:**
   - Ya dejamos el repositorio listo con `git init` y el primer commit preparado.
   - Crea un repositorio nuevo en [github.com](https://github.com/new) llamado `procrm`.
   - Ejecuta en tu terminal:
     ```bash
     git remote add origin https://github.com/TU_USUARIO/procrm.git
     git branch -M main
     git push -u origin main
     ```

2. **Conecta en Render:**
   - Ve a [render.com](https://render.com) e inicia sesión con tu GitHub.
   - Haz clic en **New +** -> **Web Service**.
   - Selecciona tu repositorio `procrm`.

3. **Configura:**
   - **Root Directory:** deja vacío.
   - **Build Command:** `cd frontend && npm install && npm run build && cd ../server && npm install`
   - **Start Command:** `cd server && node index.js`
   - Haz clic en **Create Web Service**.

✨ En 2 minutos Render te dará un enlace tipo:
`https://procrm-engine.onrender.com`

---

## 🌟 Opción 2: Despliegue en Railway (1 Clic)

1. Ve a [railway.app](https://railway.app).
2. Selecciona **Deploy from GitHub repo**.
3. Railway detectará Node.js automáticamente y te generará un dominio público instantáneo con HTTPS (ej. `https://procrm.up.railway.app`).

---

## 🏠 Opción 3: Acceso Inmediato en tu Red Local / Celulares (Sin configurar nada en la nube)

El servidor ya está escuchando en tu red. Cualquier teléfono, laptop o tablet conectado a tu misma red Wi-Fi puede entrar directamente escribiendo en el navegador:

👉 **http://192.168.1.68:8000**
