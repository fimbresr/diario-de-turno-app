import type { Job } from '../types';

const googleSheetsUrl = import.meta.env.VITE_GOOGLE_SHEETS_URL;
export const isGoogleSheetsConfigured = Boolean(googleSheetsUrl && googleSheetsUrl.trim() !== '');

function assertGoogleSheetsConfig(): void {
    if (!isGoogleSheetsConfigured) {
        throw new Error('Falta configurar VITE_GOOGLE_SHEETS_URL en el archivo .env.');
    }
}

export async function syncJobToSheets(job: Job): Promise<boolean> {
    assertGoogleSheetsConfig();

    try {
        const response = await fetch(googleSheetsUrl, {
            method: 'POST',
            mode: 'no-cors', // Essential for basic Google Scripts integration without advanced CORS setup
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: job.id,
                area: job.area,
                workType: job.workType,
                description: job.description,
                additionalComments: job.additionalComments,
                technicianName: job.technicianName,
                shift: job.shift,
                signature: job.signature, // Este podría ser bastante grande (base64)
                beforePhoto: job.beforePhoto ?? '',
                afterPhoto: job.afterPhoto ?? '',
                createdAt: job.createdAt,
                finishedAt: job.finishedAt,
                deleted: job.deleted ?? false,   // <-- para delete cross-device
            }),
        });

        // When using no-cors, response is opaque (status is 0), so we assume success if fetch didn't throw a network error.
        return true;
    } catch (error) {
        console.error('Error enviando datos a Google Sheets:', error);
        throw new Error('Fallo de red al intentar conectar con Google Sheets.');
    }
}

export async function fetchJobsFromSheets(): Promise<Job[]> {
    assertGoogleSheetsConfig();

    try {
        // Para GET usamos CORS estándar. Dado que Apps Script para WebApps públicas suele devolver 
        // JSON puro si se sigue el redirect transparente del fetch, esto recabará los registros.
        const response = await fetch(googleSheetsUrl, {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const json = await response.json();

        if (json.success && Array.isArray(json.data)) {
            return json.data;
        }

        return [];
    } catch (error) {
        console.error('Error leyendo datos desde Google Sheets:', error);
        throw new Error('No se pudieron descargar los registros en la nube.');
    }
}
