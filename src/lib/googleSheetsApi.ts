import type { Job } from '../types';

const googleSheetsUrl = import.meta.env.VITE_GOOGLE_SHEETS_URL;
export const isGoogleSheetsConfigured = Boolean(googleSheetsUrl && googleSheetsUrl.trim() !== '');

function assertGoogleSheetsConfig(): void {
  if (!isGoogleSheetsConfigured) {
    throw new Error('Falta configurar VITE_GOOGLE_SHEETS_URL en el archivo .env.');
  }
}

function getJobTimestamp(job: Job): number {
  const finished = Date.parse(job.finishedAt || '');
  const created = Date.parse(job.createdAt || '');
  const best = Number.isNaN(finished) ? created : finished;
  return Number.isNaN(best) ? 0 : best;
}

function normalizeJobs(rows: Job[]): Job[] {
  const byId = new Map<string, Job>();

  for (const row of rows) {
    if (!row?.id) continue;

    const current = byId.get(row.id);
    if (!current) {
      byId.set(row.id, row);
      continue;
    }

    const rowTs = getJobTimestamp(row);
    const currentTs = getJobTimestamp(current);

    if (rowTs > currentTs || (rowTs === currentTs && row.deleted && !current.deleted)) {
      byId.set(row.id, row);
    }
  }

  return Array.from(byId.values())
    .filter((job) => !job.deleted)
    .sort((a, b) => getJobTimestamp(b) - getJobTimestamp(a));
}

export async function syncJobToSheets(job: Job): Promise<void> {
  assertGoogleSheetsConfig();

  try {
    await fetch(googleSheetsUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: job.deleted ? 'delete' : 'upsert',
        id: job.id,
        area: job.area,
        workType: job.workType,
        description: job.description,
        additionalComments: job.additionalComments,
        technicianName: job.technicianName,
        shift: job.shift,
        signature: job.signature,
        beforePhoto: job.beforePhoto ?? '',
        afterPhoto: job.afterPhoto ?? '',
        createdAt: job.createdAt,
        finishedAt: job.finishedAt,
        deleted: job.deleted ?? false,
      }),
    });
  } catch (error) {
    console.error('Error enviando datos a Google Sheets:', error);
    throw new Error('Fallo de red al intentar conectar con Google Sheets.');
  }
}

export async function fetchJobsFromSheets(): Promise<Job[]> {
  assertGoogleSheetsConfig();

  try {
    const response = await fetch(googleSheetsUrl, {
      method: 'GET',
    });
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    let json: unknown;
    try {
      json = JSON.parse(responseText);
    } catch {
      // Apps Script suele devolver HTML cuando hay errores internos; extraemos una pista útil.
      const htmlErrorMatch = responseText.match(/<div[^>]*>([^<]*(TypeError|Error)[^<]*)<\/div>/i);
      if (htmlErrorMatch?.[1]) {
        throw new Error(`Apps Script: ${htmlErrorMatch[1].trim()}`);
      }
      throw new Error('La respuesta de Google Sheets no es JSON válido.');
    }

    if (typeof json === 'object' && json !== null && 'success' in json && 'data' in json) {
      const payload = json as { success?: boolean; data?: unknown };
      if (payload.success && Array.isArray(payload.data)) {
        return normalizeJobs(payload.data as Job[]);
      }
    }

    return [];
  } catch (error) {
    console.error('Error leyendo datos desde Google Sheets:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('No se pudieron descargar los registros en la nube.');
  }
}
