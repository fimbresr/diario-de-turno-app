# Diario de Turno - Frontend + Supabase

Aplicación React (Vite + TypeScript) para registrar trabajos de mantenimiento con backend en Supabase.

## Requisitos

- Node.js 20+
- Proyecto de Supabase

## 1) Configurar Supabase

1. Crea un proyecto en Supabase.
2. Abre SQL Editor y ejecuta el script:
   - `supabase/schema.sql`
3. Copia estos valores desde `Project Settings > API`:
   - `Project URL`
   - `anon public key`

## 2) Variables de entorno

Crea `.env.local` en la raíz del proyecto:

```bash
VITE_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
```

Puedes usar `.env.example` como referencia.

## 3) Ejecutar

```bash
npm install
npm run dev
```

## Credenciales demo iniciales

- `Carlos / 1234` (técnico)
- `Rene / admin123` (admin)

## Notas

- Si no defines variables de Supabase, la app entra en modo local demo (sin backend remoto).
- El script SQL incluye políticas RLS abiertas para demo con `anon`. Para producción debes restringir políticas y mover autenticación a Supabase Auth.
