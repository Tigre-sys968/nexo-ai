# NEXO AI — MVP

Asistente personal SaaS con:
- autenticación
- chat con OpenAI
- memoria editable
- tareas
- límite diario Free
- preparación para planes Free/Pro
- frontend React/Vite
- backend Cloudflare Workers
- Supabase Auth + Postgres

## Arquitectura

Frontend (Cloudflare Pages) -> Worker API (Cloudflare Workers) -> OpenAI + Supabase

La clave `OPENAI_API_KEY` nunca se expone al navegador.

## 1. Supabase

1. Crea un proyecto en https://supabase.com
2. Abre **SQL Editor**.
3. Copia y ejecuta `supabase/schema.sql`.
4. Ve a **Project Settings > API** y copia:
   - Project URL
   - anon/public key
   - service_role key (SECRETA)

Para pruebas rápidas puedes desactivar temporalmente "Confirm email" en Authentication. Para producción conviene mantener verificación de correo.

## 2. Backend Cloudflare Worker

Instala Node.js 20+.

```bash
cd worker
npm install
npx wrangler login
```

Añade secretos:

```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

Edita `worker/wrangler.jsonc`:
- `ALLOWED_ORIGIN`: durante desarrollo `http://localhost:5173`
- después del deploy del frontend, reemplázalo por `https://TUAPP.pages.dev`

Despliega:

```bash
npm run deploy
```

Cloudflare devolverá una URL del tipo:
`https://nexo-ai-api.TU-CUENTA.workers.dev`

## 3. Frontend

En la raíz:

```bash
npm install
cp .env.example .env
```

Edita `.env`:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=https://nexo-ai-api.TU-CUENTA.workers.dev
```

Prueba:

```bash
npm run dev
```

## 4. GitHub

Crea un repositorio y sube el proyecto:

```bash
git init
git add .
git commit -m "NEXO AI MVP"
git branch -M main
git remote add origin https://github.com/TUUSUARIO/nexo-ai.git
git push -u origin main
```

No subas `.env`, `.dev.vars` ni claves secretas.

## 5. Cloudflare Pages

En Cloudflare:
Workers & Pages -> Create -> Pages -> Connect to Git.

Configuración:
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

Variables de entorno:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`

Después de desplegar obtendrás algo como:
`https://nexo-ai.pages.dev`

Vuelve al Worker y cambia `ALLOWED_ORIGIN` a esa URL y vuelve a desplegar.

## 6. OpenAI

Crea una API key y configúrala únicamente como secreto del Worker.

El modelo por defecto está en:
`worker/wrangler.jsonc`

```json
"OPENAI_MODEL": "gpt-5.6-luna"
```

Puedes cambiarlo sin tocar el frontend.

## 7. Monetización

La base ya incluye `profiles.plan` con `free` y `pro`.

MVP recomendado:
- Free: 25 mensajes/día, tareas y memoria básica.
- Pro: más uso, análisis de documentos y automatizaciones futuras.

Antes de cobrar, conecta un procesador de pagos disponible en tu país y usa un webhook para cambiar `profiles.plan` de `free` a `pro`.

No marques usuarios manualmente como Pro como solución permanente; usa webhooks verificados del proveedor de pagos.

## Seguridad incluida

- OpenAI API key solo en Worker.
- Supabase service_role solo en Worker.
- RLS activado en tablas de usuario.
- API verifica JWT de Supabase.
- El backend filtra registros por `user_id`.
- Límite diario Free almacenado en base de datos.

## Próximos módulos recomendados

1. Historial de conversaciones.
2. Stripe/Lemon Squeezy/u otro proveedor compatible con Bolivia.
3. Subida de documentos.
4. Objetivos y calendario.
5. Herramientas de IA ejecutables.
6. Panel administrativo.
7. Recuperación de contraseña.
8. Política de privacidad y términos.
9. Borrado/exportación de datos.
10. Rate limiting reforzado.

## Estructura

```text
nexo-ai-mvp/
├─ src/
│  ├─ App.jsx
│  ├─ lib.js
│  ├─ styles.css
│  └─ components/Auth.jsx
├─ worker/
│  ├─ src/index.js
│  ├─ wrangler.jsonc
│  └─ package.json
├─ supabase/schema.sql
├─ .env.example
├─ package.json
├─ vite.config.js
└─ README.md
```
