# Diario de Turno - PostgreSQL Backend

Aplicacion React (Vite + TypeScript) con backend propio (Express + PostgreSQL), sin modo offline.

## Stack

- Frontend: React + Vite
- Backend: Express (`server/index.js`)
- Base de datos: PostgreSQL
- Auth: JWT

## Requisitos

- Node.js 20+
- PostgreSQL 14+

## Configuracion

1. Copia variables de ejemplo:

```bash
cp .env.example .env
```

2. Ajusta en `.env`:

```bash
VITE_API_BASE_URL="/api"
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/diario_turno"
JWT_SECRET="cambia-este-secreto"
JWT_EXPIRES_IN="12h"
CORS_ORIGIN="http://localhost:3000,http://72.62.201.8"
SEED_DEFAULT_USERS=true
```

3. Instala dependencias:

```bash
npm install
```

4. Ejecuta backend y frontend (en terminales separadas):

```bash
npm run api
npm run dev
```

## API principal

- `POST /api/auth/login`
- `GET /api/public/technicians`
- `GET /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id` (solo admin)

## Permisos

- Admin: crear, editar, cerrar, borrar y exportar.
- Usuario normal: crear, editar y cerrar.

## Logica operativa

- Todas las tareas se guardan y leen desde PostgreSQL.
- No hay cola offline.
- Pull-to-refresh y F5/Ctrl+R hacen sincronizacion forzada contra backend.
