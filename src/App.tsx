import React, { useEffect, useMemo, useState } from 'react';
import LoginScreen from './screens/LoginScreen';
import TechDashboardScreen from './screens/TechDashboardScreen';
import RegisterJobScreen from './screens/RegisterJobScreen';
import FinishTaskScreen from './screens/FinishTaskScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import TechHistoryScreen from './screens/TechHistoryScreen';
import TechProfileScreen from './screens/TechProfileScreen';
import AdminTeamScreen from './screens/AdminTeamScreen';
import AdminSettingsScreen from './screens/AdminSettingsScreen';
import { isGoogleSheetsConfigured, syncJobToSheets, fetchJobsFromSheets } from './lib/googleSheetsApi';
import { generatePdf } from './lib/pdfExport';
import { getLocalJobs, saveLocalJob, deleteLocalJob, getDeletedJobIds } from './lib/localDb';
import type { Job, JobDraft, Screen, Technician } from './types';

const fallbackTechnicians: Technician[] = [
  { id: 'sanchez_hector', name: 'HECTOR RAUL SANCHEZ BUELNA', role: 'tech', shift: '', password: 'HS38123' },
  { id: 'encinas_luis', name: 'LUIS CARLOS ENCINAS CORDOVA', role: 'tech', shift: '', password: 'LE52124' },
  { id: 'fimbres_rene', name: 'RENE FIMBRES VASQUEZ', role: 'admin', shift: '', password: 'RF15621' },
  { id: 'mendoza_rogelio', name: 'ROGELIO MENDOZA GUEVARA', role: 'tech', shift: '', password: 'RM55624' },
  { id: 'barba_jesus', name: 'JESUS MIGUEL BARBA ALCANTAR', role: 'tech', shift: '', password: 'JB57025' },
  { id: 'quijada_rogelio', name: 'ROGELIO ALBERTO QUIJADA GARCIA', role: 'tech', shift: '', password: 'RQ44523' },
  { id: 'lopez_carlos', name: 'CARLOS LOPEZ RENTERIA', role: 'tech', shift: '', password: 'CL65326' },
];

const fallbackJobs: Job[] = [
  {
    id: 'job-1',
    area: 'Lobby Principal',
    workType: 'Reparación A/C',
    description: 'Ajuste de termostato y limpieza de filtros.',
    additionalComments: '',
    technicianName: 'Carlos',
    shift: 'Turno Matutino',
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    finishedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    signature: 'Carlos T.',
    beforePhoto: null,
    afterPhoto: null,
  },
  {
    id: 'job-2',
    area: 'Pasillo B • Nivel 2',
    workType: 'Cambio de Luminarias',
    description: 'Sustitución de 8 luminarias LED y prueba eléctrica.',
    additionalComments: '',
    technicianName: 'Carlos',
    shift: 'Turno Matutino',
    createdAt: new Date(Date.now() - 1000 * 60 * 280).toISOString(),
    finishedAt: new Date(Date.now() - 1000 * 60 * 220).toISOString(),
    signature: 'Carlos T.',
    beforePhoto: null,
    afterPhoto: null,
  },
  {
    id: 'job-3',
    area: 'Cuarto de Máquinas',
    workType: 'Revisión Generador',
    description: 'Inspección preventiva y bitácora de funcionamiento.',
    additionalComments: '',
    technicianName: 'Rene',
    shift: 'Turno Completo',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    finishedAt: new Date().toISOString(),
    signature: '',
    beforePhoto: null,
    afterPhoto: null,
  },
];

const emptyDraft: JobDraft = {
  area: '',
  workType: '',
  description: '',
  additionalComments: '',
  beforePhoto: null,
  afterPhoto: null,
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [currentUser, setCurrentUser] = useState<Technician | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>(fallbackTechnicians);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [draft, setDraft] = useState<JobDraft>(emptyDraft);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [backendError, setBackendError] = useState('');
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Diario de Turno: todos los usuarios ven el log completo del turno.
  // Las restricciones son de ACCIÓN (borrar/exportar = solo admin), no de visibilidad.
  const visibleJobs = useMemo(() => {
    if (!currentUser) return [];
    return jobs;
  }, [currentUser, jobs]);

  useEffect(() => {
    let active = true;

    async function initializeData() {
      setIsBootstrapping(true);
      try {
        const local = await getLocalJobs();
        if (active) setJobs(local.length > 0 ? local : fallbackJobs);

        if (isGoogleSheetsConfigured) {
          try {
            const remoteJobs = await fetchJobsFromSheets();

            if (!active) return;

            const currentLocal = await getLocalJobs();
            const localMap = new Map(currentLocal.map((j) => [j.id, j]));
            const deletedIds = await getDeletedJobIds();
            let changedLocal = false;

            // Crear mapa de IDs remotos (que no están borrados) para verificar existencia
            const remoteActiveIds = new Set<string>();

            for (const rj of remoteJobs) {
              // Si la tarea fue marcada como borrada en otro dispositivo → eliminar localmente
              if (rj.deleted) {
                if (localMap.has(rj.id)) {
                  await deleteLocalJob(rj.id);
                  changedLocal = true;
                }
                continue;
              }

              remoteActiveIds.add(rj.id);

              // No re-importar lo que el admin borró desde ESTE dispositivo
              if (deletedIds.has(rj.id)) continue;

              const localVersion = localMap.get(rj.id);
              if (!localVersion) {
                // Tarea nueva desde la nube — agregarla
                await saveLocalJob({ ...rj, syncStatus: 'synced' });
                changedLocal = true;
              } else if (localVersion.syncStatus === 'synced') {
                // Actualizar con la versión remota (otro dispositivo pudo haberla editado)
                await saveLocalJob({ ...rj, syncStatus: 'synced' });
                changedLocal = true;
              }
              // Si local está 'pending', NO sobreescribir con la remota
            }

            // ── Limpieza: eliminar tareas locales 'synced' que ya no existen en la nube ──
            // Esto cubre el caso donde el admin borró tareas directamente de Sheets
            // o donde el Apps Script no gestiona la columna 'deleted'.
            for (const [localId, localJob] of localMap.entries()) {
              if (localJob.syncStatus === 'synced' && !remoteActiveIds.has(localId) && !deletedIds.has(localId)) {
                await deleteLocalJob(localId);
                changedLocal = true;
              }
            }

            if (changedLocal && active) {
              const finalLocal = await getLocalJobs();
              setJobs(finalLocal.length > 0 ? finalLocal : fallbackJobs);
            }
          } catch (fetchError) {
            console.log("Aviso: No se pudo descargar historial de la nube (" + fetchError + "). Se usará puramente la caché offline.");
          }
        }
      } catch (error) {
        if (active) setBackendError(error instanceof Error ? error.message : 'Error inicializando la base de datos.');
      } finally {
        if (active) setIsBootstrapping(false);
      }
    }

    void initializeData();

    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (technicianId: string, password: string, shift: string) => {

    const user = technicians.find((tech) => tech.id === technicianId);

    if (!user || user.password !== password) {
      return false;
    }

    setCurrentUser({ ...user, shift });
    setBackendError('');
    setCurrentScreen(user.role === 'admin' ? 'admin_dashboard' : 'tech_dashboard');
    return true;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setDraft(emptyDraft);
    setCurrentScreen('login');
  };

  const handleContinueDraft = (nextDraft: JobDraft) => {
    setDraft(nextDraft);
  };

  const handleFinalizeJob = async (signature: string) => {
    if (!currentUser) throw new Error('No hay sesión activa.');

    try {
      let savedJob: Job;

      if (editingJobId) {
        const existing = jobs.find((j) => j.id === editingJobId);
        if (existing) {
          const updated: Job = {
            ...existing,
            area: draft.area,
            workType: draft.workType,
            description: draft.description,
            additionalComments: draft.additionalComments,
            signature,
            beforePhoto: draft.beforePhoto,
            afterPhoto: draft.afterPhoto,
            syncStatus: 'pending' as const
          };
          savedJob = await saveLocalJob(updated);
          setJobs((prev) => prev.map((j) => (j.id === editingJobId ? savedJob : j)));
        } else {
          return;
        }
      } else {
        const newJob: Job = {
          id: `job-${Date.now()}`,
          area: draft.area,
          workType: draft.workType,
          description: draft.description,
          additionalComments: draft.additionalComments,
          technicianName: currentUser.name,
          shift: currentUser.shift,
          createdAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          signature,
          beforePhoto: draft.beforePhoto,
          afterPhoto: draft.afterPhoto,
          syncStatus: 'pending' as const
        };
        savedJob = await saveLocalJob(newJob);
        setJobs((prev) => [savedJob, ...prev]);
      }

      // ── Sincronización automática inmediata ──────────────────────
      if (isGoogleSheetsConfigured) {
        setIsSyncing(true);
        try {
          await syncJobToSheets(savedJob);
          const synced = { ...savedJob, syncStatus: 'synced' as const };
          await saveLocalJob(synced);
          setJobs((prev) =>
            prev.map((j) => (j.id === synced.id ? synced : j))
          );
        } catch (syncErr) {
          // Si falla la red, quedará como 'pending' para sincronizar después
          console.warn('Sync automático fallido, quedará pendiente:', syncErr);
        } finally {
          setIsSyncing(false);
        }
      }

      setBackendError('');
    } catch (e) {
      console.error(e);
      setBackendError('Error guardando tarea en el almacenamiento persistente local.');
    }

    setDraft(emptyDraft);
    setEditingJobId(null);
    setCurrentScreen(currentUser.role === 'admin' ? 'admin_dashboard' : 'tech_dashboard');
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      // Encontrar la tarea antes de borrarla para poder enviar el soft-delete a Sheets
      const jobToDelete = jobs.find(j => j.id === jobId);

      // 1. Borrar localmente y marcar como borrada
      await deleteLocalJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      setBackendError('');

      // 2. Propagar el borrado a Google Sheets (para que otros dispositivos también la eliminen)
      if (jobToDelete && isGoogleSheetsConfigured) {
        try {
          await syncJobToSheets({ ...jobToDelete, deleted: true, syncStatus: 'synced' });
        } catch (syncErr) {
          console.warn('No se pudo propagar el borrado a la nube:', syncErr);
          // No es crítico: la lista negra local ya evita que reaparezca en ESTE dispositivo
        }
      }
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : 'Error borrando la tarea.');
    }
  };

  const syncPendingJobs = async () => {
    if (!isGoogleSheetsConfigured) {
      alert('La URL de Google Sheets no está configurada en .env o careces de conexión a Internet.');
      return;
    }
    if (!currentUser) return;
    setIsSyncing(true);
    setBackendError('');

    try {
      // ── Subir pendientes ────────────────────────────────────────
      const allLocal = await getLocalJobs();
      const pending = allLocal.filter((j) => j.syncStatus === 'pending');

      for (const pJob of pending) {
        try {
          await syncJobToSheets(pJob);
          await saveLocalJob({ ...pJob, syncStatus: 'synced' });
        } catch (e) {
          console.error('Error sincronizando la tarea:', pJob.id, e);
        }
      }

      // ── Descargar registros remotos nuevos (bidireccional) ──────
      try {
        const remoteJobs = await fetchJobsFromSheets();
        const currentLocal = await getLocalJobs();
        const localMap = new Map(currentLocal.map((j) => [j.id, j]));
        const deletedIds = await getDeletedJobIds();
        let downloadedNew = false;

        // Crear mapa de IDs remotos (que no están borrados) para verificar existencia
        const remoteActiveIds = new Set<string>();

        for (const rj of remoteJobs) {
          // Si la tarea fue borrada en otro dispositivo → eliminarla aquí también
          if (rj.deleted) {
            if (localMap.has(rj.id)) {
              await deleteLocalJob(rj.id);
              downloadedNew = true;
            }
            continue;
          }

          remoteActiveIds.add(rj.id);

          // No re-importar lo que el admin borró desde ESTE dispositivo
          if (deletedIds.has(rj.id)) continue;

          const localVersion = localMap.get(rj.id);
          if (!localVersion) {
            // Registro nuevo de otro dispositivo
            await saveLocalJob({ ...rj, syncStatus: 'synced' });
            downloadedNew = true;
          } else if (localVersion.syncStatus === 'synced') {
            // Actualizar con versión remota (puede haber sido editada en otro dispositivo)
            await saveLocalJob({ ...rj, syncStatus: 'synced' });
            downloadedNew = true;
          }
          // Si está 'pending' en local, conservar la versión local
        }

        // ── Limpieza: eliminar tareas locales 'synced' que ya no existen en la nube ──
        // Esto cubre el caso donde el admin borró tareas directamente de Sheets
        // o donde el Apps Script no gestiona la columna 'deleted'.
        for (const [localId, localJob] of localMap.entries()) {
          if (localJob.syncStatus === 'synced' && !remoteActiveIds.has(localId) && !deletedIds.has(localId)) {
            await deleteLocalJob(localId);
            downloadedNew = true;
          }
        }

        if (downloadedNew) {
          console.log('Nuevos registros descargados/actualizados de la nube.');
        }
      } catch (fetchErr) {
        console.warn('No se pudo descargar registros remotos:', fetchErr);
      }

      // Recargar lista local unificada
      const finalLocal = await getLocalJobs();
      setJobs(finalLocal.length > 0 ? finalLocal : fallbackJobs);
    } catch (e) {
      console.error(e);
      setBackendError('Error general durante la sincronización.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEditJob = (job: Job) => {
    setDraft({
      area: job.area,
      workType: job.workType,
      description: job.description,
      additionalComments: job.additionalComments,
      beforePhoto: job.beforePhoto,
      afterPhoto: job.afterPhoto,
    });
    setEditingJobId(job.id);
    setCurrentScreen('register_job');
  };

  const handleExportJob = async (job: Job) => {
    try {
      await generatePdf(job);
    } catch (e) {
      alert('Error exportando a PDF. Asegúrate de tener conexión.');
    }
  };

  const navigate = (screen: Screen) => {
    if (!currentUser && screen !== 'login') {
      setCurrentScreen('login');
      return;
    }

    if (screen === 'register_job' && currentScreen !== 'register_job') {
      setDraft(emptyDraft);
      setEditingJobId(null);
    }

    setCurrentScreen(screen);
  };

  return (
    <div className="min-h-screen bg-[#101922] flex justify-center">
      <div className="w-full max-w-md bg-[#101922] shadow-2xl relative overflow-hidden">
        {backendError && currentScreen !== 'login' && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-[12px] text-amber-300">
            Backend: {backendError}
          </div>
        )}

        {currentScreen === 'login' && (
          <LoginScreen
            onLogin={handleLogin}
            technicians={technicians}
            isBootstrapping={isBootstrapping}
            backendMode={isGoogleSheetsConfigured ? 'google' : 'local'}
            backendError={backendError}
          />
        )}

        {currentUser && currentScreen === 'tech_dashboard' && (
          <TechDashboardScreen
            jobs={visibleJobs}
            onNavigate={navigate}
            onLogout={handleLogout}
            technicianName={currentUser.name}
            shift={currentUser.shift}
            isSyncing={isSyncing}
            onSyncPending={syncPendingJobs}
          />
        )}

        {currentUser && currentScreen === 'register_job' && (
          <RegisterJobScreen
            onNavigate={navigate}
            initialDraft={draft}
            onContinue={handleContinueDraft}
            homeScreen={currentUser.role === 'admin' ? 'admin_dashboard' : 'tech_dashboard'}
          />
        )}

        {currentUser && currentScreen === 'finish_task' && (
          <FinishTaskScreen
            onNavigate={navigate}
            onFinalize={handleFinalizeJob}
            technicianName={currentUser.name}
            draft={draft}
          />
        )}

        {currentUser && currentScreen === 'tech_history' && (
          <TechHistoryScreen
            jobs={visibleJobs}
            onNavigate={navigate}
            technicianName={currentUser.name}
            userRole={currentUser.role}
            onEditJob={handleEditJob}
            onDeleteJob={handleDeleteJob}
            onExportJob={handleExportJob}
            isSyncing={isSyncing}
            onSyncPending={syncPendingJobs}
          />
        )}

        {currentUser && currentScreen === 'tech_profile' && (
          <TechProfileScreen
            jobs={visibleJobs}
            onNavigate={navigate}
            onLogout={handleLogout}
            technicianName={currentUser.name}
            shift={currentUser.shift}
          />
        )}

        {currentUser && currentScreen === 'admin_dashboard' && (
          <AdminDashboardScreen
            onNavigate={navigate}
            onLogout={handleLogout}
            jobs={visibleJobs}
            adminName={currentUser.name}
            onEditJob={handleEditJob}
            onDeleteJob={handleDeleteJob}
            onExportJob={handleExportJob}
            isSyncing={isSyncing}
            onSyncPending={syncPendingJobs}
          />
        )}

        {currentUser && currentScreen === 'admin_team' && (
          <AdminTeamScreen
            onNavigate={navigate}
            technicians={technicians}
          />
        )}

        {currentUser && currentScreen === 'admin_settings' && (
          <AdminSettingsScreen
            onNavigate={navigate}
            onLogout={handleLogout}
          />
        )}
      </div>
    </div>
  );
}
