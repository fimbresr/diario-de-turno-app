# Diario de Turno - Google Sheets Online

Aplicación React (Vite + TypeScript) con sincronización online directa a Google Sheets (sin modo offline).

## Requisitos

- Node.js 20+
- Un Google Apps Script publicado como Web App
- URL del Web App en `VITE_GOOGLE_SHEETS_URL`

## Configuración

1. En Google Apps Script:
   - Crea un proyecto vinculado a una hoja.
   - Pega el archivo `apps-script/Code.gs`.
   - Si el script es standalone, ve a `Project Settings > Script properties` y agrega:
     - `SPREADSHEET_ID=<ID de tu Google Sheet>`
   - Publica como Web App con acceso de lectura/escritura para quienes usarán la app.

2. Crea `.env.local` en la raíz:

```bash
VITE_GOOGLE_SHEETS_URL="https://script.google.com/macros/s/TU_ID/exec"
```

3. Ejecuta:

```bash
npm install
npm run dev
```

## Lógica operativa

- Todas las tareas se leen desde Google Sheets al iniciar.
- Al cerrar o editar tarea, se envía inmediatamente a Google Sheets y se refresca el historial.
- Al borrar tarea (solo admin), se envía evento de borrado y se refresca historial.
- No hay cola offline ni sincronización manual.

## Permisos

- Admin: crear, editar, cerrar, borrar y exportar.
- Usuario normal: crear, editar y cerrar.
