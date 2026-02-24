import React, { useEffect, useMemo, useRef, useState } from 'react';
import LoginScreen from './screens/LoginScreen';
import TechDashboardScreen from './screens/TechDashboardScreen';
import RegisterJobScreen from './screens/RegisterJobScreen';
import FinishTaskScreen from './screens/FinishTaskScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import TechHistoryScreen from './screens/TechHistoryScreen';
import TechProfileScreen from './screens/TechProfileScreen';
import AdminTeamScreen from './screens/AdminTeamScreen';
import AdminSettingsScreen from './screens/AdminSettingsScreen';
import {
  clearAuthToken,
  deleteJobInBackend,
  fetchJobsFromBackend,
  fetchTechniciansFromBackend,
  hasAuthToken,
  loginAgainstBackend,
  upsertJobInBackend,
} from './lib/backendApi';
import { generatePdf } from './lib/pdfExport';
import type { Job, JobDraft, Screen, Technician } from './types';

const emptyDraft: JobDraft = {
  area: '',
  workType: '',
  description: '',
  additionalComments: '',
  beforePhoto: null,
  afterPhoto: null,
};

const sessionStorageKey = 'diario_turno_session_v1';
const pullThreshold = 80;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function loadPersistedUser(): Technician | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(sessionStorageKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Technician;
    if (!parsed?.id || !parsed?.name || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

function findScrollableAncestor(element: HTMLElement | null): HTMLElement | null {
  let current = element;

  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight;

    if (isScrollable) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

export default function App() {
  const restoredUser = loadPersistedUser();
  const [currentScreen, setCurrentScreen] = useState<Screen>(
    restoredUser ? (restoredUser.role === 'admin' ? 'admin_dashboard' : 'tech_dashboard') : 'login',
  );
  const [currentUser, setCurrentUser] = useState<Technician | null>(restoredUser);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [draft, setDraft] = useState<JobDraft>(emptyDraft);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [backendError, setBackendError] = useState('');
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const touchStartYRef = useRef<number | null>(null);
  const pullActiveRef = useRef(false);
  const scrollElementRef = useRef<HTMLElement | null>(null);

  const visibleJobs = useMemo(() => {
    if (!currentUser) return [];
    return jobs;
  }, [currentUser, jobs]);

  const refreshJobs = async (retryCount = 1, retryDelayMs = 450) => {
    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        const remoteJobs = await fetchJobsFromBackend();
        setJobs(remoteJobs);
        return;
      } catch (error) {
        if (attempt === retryCount) {
          throw error;
        }
        await wait(retryDelayMs);
      }
    }
  };

  useEffect(() => {
    let active = true;

    async function initializeData() {
      setIsBootstrapping(true);

      try {
        const techniciansList = await fetchTechniciansFromBackend();
        if (!active) return;

        setTechnicians(techniciansList);

        if (restoredUser && hasAuthToken()) {
          const remoteJobs = await fetchJobsFromBackend();
          if (!active) return;
          setJobs(remoteJobs);
        } else if (restoredUser && !hasAuthToken()) {
          setCurrentUser(null);
          setCurrentScreen('login');
          setJobs([]);
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(sessionStorageKey);
          }
        }

        setBackendError('');
      } catch (error) {
        if (!active) return;
        setBackendError(error instanceof Error ? error.message : 'No se pudieron cargar los datos del backend.');
      } finally {
        if (active) {
          setIsBootstrapping(false);
        }
      }
    }

    void initializeData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (currentUser) {
      window.localStorage.setItem(sessionStorageKey, JSON.stringify(currentUser));
      return;
    }

    window.localStorage.removeItem(sessionStorageKey);
  }, [currentUser]);

  const handleLogin = async (technicianId: string, password: string, shift: string) => {
    try {
      const user = await loginAgainstBackend(technicianId, password, shift);
      setCurrentUser(user);
      setBackendError('');
      setCurrentScreen(user.role === 'admin' ? 'admin_dashboard' : 'tech_dashboard');
      await refreshJobs(2, 500);
      return true;
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
      return false;
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    setDraft(emptyDraft);
    setEditingJobId(null);
    setCurrentScreen('login');
    setPullDistance(0);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(sessionStorageKey);
    }
  };

  const handleContinueDraft = (nextDraft: JobDraft) => {
    setDraft(nextDraft);
  };

  const handleFinalizeJob = async (signature: string) => {
    if (!currentUser) {
      throw new Error('No hay sesión activa.');
    }

    setIsWorking(true);

    try {
      const nowIso = new Date().toISOString();

      let payload: Job;

      if (editingJobId) {
        const existing = jobs.find((job) => job.id === editingJobId);

        if (!existing) {
          throw new Error('No se encontró la tarea que intentas editar.');
        }

        payload = {
          ...existing,
          area: draft.area,
          workType: draft.workType,
          description: draft.description,
          additionalComments: draft.additionalComments,
          signature,
          beforePhoto: draft.beforePhoto,
          afterPhoto: draft.afterPhoto,
          finishedAt: nowIso,
          deleted: false,
        };
      } else {
        payload = {
          id: `job-${Date.now()}`,
          area: draft.area,
          workType: draft.workType,
          description: draft.description,
          additionalComments: draft.additionalComments,
          technicianName: currentUser.name,
          shift: currentUser.shift,
          createdAt: nowIso,
          finishedAt: nowIso,
          signature,
          beforePhoto: draft.beforePhoto,
          afterPhoto: draft.afterPhoto,
          deleted: false,
        };
      }

      await upsertJobInBackend(payload);
      try {
        await refreshJobs(2, 500);
        setBackendError('');
      } catch {
        // El write pudo haberse aplicado aunque el refresh falle; mantenemos UI consistente.
        setJobs((prev) => {
          const index = prev.findIndex((job) => job.id === payload.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = payload;
            return next;
          }
          return [payload, ...prev];
        });
        setBackendError('La tarea se guardó, pero no se pudo refrescar el historial en este momento.');
      }

      setDraft(emptyDraft);
      setEditingJobId(null);
      setCurrentScreen(currentUser.role === 'admin' ? 'admin_dashboard' : 'tech_dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo sincronizar el cierre de la tarea.';
      setBackendError(message);
      throw new Error(message);
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      setBackendError('Solo el administrador puede borrar tareas.');
      return;
    }

    const job = jobs.find((item) => item.id === jobId);
    if (!job) {
      return;
    }

    setIsWorking(true);

    try {
      await deleteJobInBackend(jobId);

      try {
        await refreshJobs(2, 500);
        setBackendError('');
      } catch {
        // Si falla refresco, quitamos localmente para no reintroducir la fila en la UI.
        setJobs((prev) => prev.filter((item) => item.id !== jobId));
        setBackendError('La tarea se borró, pero no se pudo refrescar el historial en este momento.');
      }
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : 'No se pudo borrar la tarea en la nube.');
    } finally {
      setIsWorking(false);
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
    if (!currentUser || currentUser.role !== 'admin') {
      setBackendError('Solo el administrador puede exportar PDF.');
      return;
    }

    try {
      await generatePdf(job);
    } catch {
      setBackendError('Error exportando a PDF.');
    }
  };

  const forceSync = async () => {
    if (!currentUser || isBootstrapping || isWorking) return;

    setIsWorking(true);
    try {
      await refreshJobs(2, 500);
      setBackendError('');
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : 'No se pudo sincronizar en este momento.');
    } finally {
      setIsWorking(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const isReloadKey = event.key === 'F5'
        || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r');

      if (!isReloadKey) return;

      event.preventDefault();
      void forceSync();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [currentUser, isBootstrapping, isWorking]);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!currentUser || isWorking || isBootstrapping) return;

    const touch = event.touches[0];
    if (!touch) return;

    const target = event.target as HTMLElement;
    const scrollable = findScrollableAncestor(target);

    if (scrollable && scrollable.scrollTop > 0) {
      pullActiveRef.current = false;
      touchStartYRef.current = null;
      scrollElementRef.current = scrollable;
      return;
    }

    touchStartYRef.current = touch.clientY;
    pullActiveRef.current = true;
    scrollElementRef.current = scrollable;
    setPullDistance(0);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!pullActiveRef.current || touchStartYRef.current === null) return;

    const touch = event.touches[0];
    if (!touch) return;

    if (scrollElementRef.current && scrollElementRef.current.scrollTop > 0) {
      pullActiveRef.current = false;
      setPullDistance(0);
      return;
    }

    const deltaY = touch.clientY - touchStartYRef.current;
    if (deltaY <= 0) {
      setPullDistance(0);
      return;
    }

    event.preventDefault();
    setPullDistance(Math.min(120, deltaY * 0.6));
  };

  const handleTouchEnd = () => {
    if (!pullActiveRef.current) {
      setPullDistance(0);
      return;
    }

    const shouldSync = pullDistance >= pullThreshold;
    pullActiveRef.current = false;
    touchStartYRef.current = null;
    scrollElementRef.current = null;
    setPullDistance(0);

    if (shouldSync) {
      void forceSync();
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
      <div
        className="w-full max-w-md bg-[#101922] shadow-2xl relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {currentUser && (
          <div
            className={`absolute top-0 left-0 right-0 z-50 flex items-center justify-center transition-all duration-150 ${
              pullDistance > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{ height: `${Math.max(0, pullDistance)}px` }}
          >
            <div className="mt-2 rounded-full bg-[#192633] border border-[#324d67] px-3 py-1 text-[11px] text-slate-300">
              {pullDistance >= pullThreshold ? 'Suelta para sincronizar' : 'Jala para sincronizar'}
            </div>
          </div>
        )}

        {backendError && currentScreen !== 'login' && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-[12px] text-amber-300">
            Backend: {backendError}
          </div>
        )}

        {currentScreen === 'login' && (
          <LoginScreen
            onLogin={handleLogin}
            technicians={technicians}
            isBootstrapping={isBootstrapping || isWorking}
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
