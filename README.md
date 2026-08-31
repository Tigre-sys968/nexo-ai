# NEXO AI 1.0

MVP de asistente personal con React + Vite + Cloudflare Workers + Supabase.

## 1. GitHub

Sube TODO el contenido de este proyecto a tu repositorio `nexo-ai`.

## 2. Supabase

Ya creaste el proyecto. En SQL Editor pega y ejecuta:
`supabase/schema.sql`

Después ve a Project Settings > API Keys y copia:
- Project URL
- Publishable key

## 3. Cloudflare Workers Builds

Conecta el repositorio `nexo-ai`.

Configuración:
- Root directory: `/` (dejar vacío)
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Production branch: `main`

El `wrangler.jsonc` de la raíz ya indica:
- Worker: `nexo-ai`
- Assets: `./dist`
- SPA fallback

## 4. Variables del frontend

En Cloudflare Workers > Settings > Variables and Secrets, añade como variables de texto:
- VITE_SUPABASE_URL = tu Project URL
- VITE_SUPABASE_PUBLISHABLE_KEY = tu Publishable key
- VITE_API_URL = /api

Estas variables empiezan con VITE_ porque deben estar disponibles para el navegador. La publishable key está diseñada para uso público y las políticas RLS protegen los datos.

## 5. Secrets del Worker

Añade como Secret:
- OPENAI_API_KEY = tu clave de OpenAI
- OPENAI_MODEL = un modelo disponible en tu cuenta
- SUPABASE_URL = tu Project URL
- SUPABASE_PUBLISHABLE_KEY = tu Publishable key

NO subas claves secretas a GitHub.

## 6. Despliegue

Haz commit de los archivos. Cloudflare ejecutará:
npm run build
npx wrangler deploy

Tu Worker servirá tanto la API `/api/chat` como la aplicación web.

## 7. Nota sobre el modelo

El código NO fuerza un nombre de modelo inventado. Debes colocar en `OPENAI_MODEL` un ID de modelo que aparezca disponible para tu API de OpenAI.

## 8. Qué incluye

- Registro e inicio de sesión con Supabase Auth
- Chat con OpenAI mediante Cloudflare Worker
- Memoria local del navegador
- Tareas locales
- Diseño responsive
- Estructura preparada para planes Free/Pro
- Sin claves privadas en el frontend
