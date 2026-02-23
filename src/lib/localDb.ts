import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';
import type { Job } from '../types';

// Store principal de trabajos
localforage.config({
    name: 'DiarioDeTurnoApp',
    storeName: 'jobs_store'
});

// Store separado para IDs de tareas borradas por el admin
const deletedStore = localforage.createInstance({
    name: 'DiarioDeTurnoApp',
    storeName: 'deleted_ids'
});

/**
 * Registra el ID de una tarea como "borrada" para que no vuelva desde la nube.
 */
export async function markJobDeleted(id: string): Promise<void> {
    await deletedStore.setItem(id, true);
}

/**
 * Devuelve el Set de IDs que el admin borró definitivamente.
 */
export async function getDeletedJobIds(): Promise<Set<string>> {
    const ids = new Set<string>();
    await deletedStore.iterate((_value, key) => {
        ids.add(key);
    });
    return ids;
}

/**
 * Obtiene todas las tareas desde el almacenamiento offline (IndexedDB).
 * Se ordenan de la más reciente a la más antigua.
 */
export async function getLocalJobs(): Promise<Job[]> {
    try {
        const jobs: Job[] = [];
        await localforage.iterate((value: Job) => {
            jobs.push(value);
        });
        // Sort descending by finishedAt
        return jobs.sort((a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime());
    } catch (error) {
        console.error('Error obteniendo tareas locales:', error);
        return [];
    }
}

/**
 * Guarda o actualiza una tarea en la base de datos local.
 * Genera un UUID real si no lo tiene.
 */
export async function saveLocalJob(job: Job): Promise<Job> {
    try {
        // Solo generar ID si realmente no lo tiene (nuevos registros)
        if (!job.id) {
            job.id = uuidv4();
        }

        await localforage.setItem(job.id, job);
        return job;
    } catch (error) {
        console.error('Error guardando tarea local:', error);
        throw error;
    }
}

/**
 * Elimina fisicamente una tarea local y la marca como borrada para que
 * no vuelva a aparecer cuando se descargue de la nube.
 */
export async function deleteLocalJob(id: string): Promise<void> {
    try {
        await localforage.removeItem(id);
        await markJobDeleted(id);
    } catch (error) {
        console.error('Error eliminando tarea local:', error);
        throw error;
    }
}

/**
 * Filtra tareas locales según su estado de sincronización.
 */
export async function getPendingSyncJobs(): Promise<Job[]> {
    const allJobs = await getLocalJobs();
    return allJobs.filter(j => j.syncStatus === 'pending');
}
