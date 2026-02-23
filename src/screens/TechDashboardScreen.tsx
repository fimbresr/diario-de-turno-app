import React from 'react';
import type { Job, Screen } from '../types';

interface TechDashboardScreenProps {
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  jobs: Job[];
  technicianName: string;
  shift: string;
  isSyncing: boolean;
  onSyncPending: () => Promise<void>;
}

type JobVisual = 'blue' | 'amber' | 'purple' | 'rose';

const visualStyles: Record<JobVisual, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-900/30', text: 'text-blue-400' },
  amber: { bg: 'bg-amber-900/30', text: 'text-amber-400' },
  purple: { bg: 'bg-purple-900/30', text: 'text-purple-400' },
  rose: { bg: 'bg-rose-900/30', text: 'text-rose-400' },
};



function inferIcon(workType: string): string {
  const lower = workType.toLowerCase();

  if (lower.includes('agua') || lower.includes('plomer')) return 'plumbing';
  if (lower.includes('elect') || lower.includes('lumin') || lower.includes('generador')) return 'bolt';
  if (lower.includes('aire') || lower.includes('hvac') || lower.includes('a/c')) return 'ac_unit';
  return 'engineering';
}

function inferVisual(workType: string): JobVisual {
  const lower = workType.toLowerCase();
  if (lower.includes('elect') || lower.includes('generador')) return 'amber';
  if (lower.includes('agua') || lower.includes('plomer')) return 'rose';
  if (lower.includes('inspec') || lower.includes('revision')) return 'purple';
  return 'blue';
}

export default function TechDashboardScreen({ onNavigate, onLogout, jobs, technicianName, shift, isSyncing, onSyncPending }: TechDashboardScreenProps) {
  const recentJobs = jobs.slice(0, 4);

  const today = new Date().toDateString();
  const completedToday = jobs.filter((job) => new Date(job.finishedAt).toDateString() === today).length;
  const pendingSync = jobs.filter(j => j.syncStatus === 'pending').length;

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[#101922]">
      <header className="flex-none px-5 pt-8 pb-4 bg-[#101922] z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="size-12 rounded-full overflow-hidden border-2 border-primary/20 bg-[#192633] flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">person</span>
              </div>
              <div className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-[#101922] rounded-full"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight text-white">Hola, {technicianName}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="material-symbols-outlined text-amber-500 text-[16px] leading-none">light_mode</span>
                <span className="text-xs font-medium text-slate-400">{shift}</span>
              </div>
            </div>
          </div>
          <button className="relative p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-300" onClick={onLogout} type="button">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-24 scrollbar-hide">
        <div className="py-2 flex flex-col gap-3">
          <button
            onClick={() => onNavigate('register_job')}
            className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-white p-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] group"
            type="button"
          >
            <span className="bg-white/20 p-1.5 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <span className="material-symbols-outlined">add</span>
            </span>
            <span className="text-lg font-bold">Registrar Nuevo Trabajo</span>
          </button>

          <button
            onClick={onSyncPending}
            disabled={isSyncing}
            className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl border shadow-lg mb-2 transition-all active:scale-[0.98] group disabled:opacity-50 ${pendingSync > 0
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-green-900/20 hover:bg-green-900/30 text-green-300 border-green-800/40'
              }`}
            type="button"
          >
            <span className="bg-slate-900/50 p-1.5 rounded-full flex items-center justify-center shadow-inner">
              {isSyncing ? (
                <span className="material-symbols-outlined animate-spin text-primary">sync</span>
              ) : pendingSync > 0 ? (
                <span className="material-symbols-outlined text-amber-400">cloud_upload</span>
              ) : (
                <span className="material-symbols-outlined text-green-400">cloud_done</span>
              )}
            </span>
            <span className="text-sm font-semibold">
              {isSyncing
                ? 'Sincronizando a la Nube...'
                : pendingSync > 0
                  ? `Sincronizar tareas (${pendingSync} pendientes)`
                  : 'Todo sincronizado ✓'}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6 mb-8">
          <div className="bg-[#192633] p-4 rounded-xl border border-slate-800 shadow-sm flex flex-col justify-between h-24">
            <div className="flex justify-between items-start">
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Hoy</span>
              <span className="material-symbols-outlined text-primary text-[20px]">assignment_turned_in</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-white">{completedToday}</span>
              <span className="text-xs text-slate-400 ml-1">completados</span>
            </div>
          </div>
          <div className="bg-[#192633] p-4 rounded-xl border border-slate-800 shadow-sm flex flex-col justify-between h-24">
            <div className="flex justify-between items-start">
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Pendientes</span>
              <span className="material-symbols-outlined text-amber-500 text-[20px]">schedule</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-white">{pendingSync}</span>
              <span className="text-xs text-slate-400 ml-1">por sincronizar</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Trabajos Recientes</h2>
            <button className="text-sm text-primary font-medium hover:underline" onClick={() => onNavigate('tech_history')} type="button">Ver todo</button>
          </div>

          {recentJobs.length === 0 && (
            <div className="bg-[#192633] p-4 rounded-xl border border-slate-800 text-sm text-slate-400">
              No hay trabajos registrados todavía.
            </div>
          )}

          {recentJobs.map((job) => {
            const visual = inferVisual(job.workType);
            return (
              <div key={job.id} className="bg-[#192633] p-4 rounded-xl border border-slate-800 shadow-sm flex gap-4 items-center active:bg-[#233648] transition-colors">
                <div className={`size-12 rounded-lg ${visualStyles[visual].bg} flex items-center justify-center shrink-0 ${visualStyles[visual].text}`}>
                  <span className="material-symbols-outlined">{inferIcon(job.workType)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{job.workType}</h3>
                  <p className="text-xs text-slate-400 truncate">{job.area}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-medium text-slate-500">{new Date(job.finishedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <nav className="absolute bottom-0 left-0 right-0 border-t border-[#233648] bg-[#192633] px-6 pb-6 pt-3 z-20">
        <div className="flex justify-between items-center">
          <button className="flex flex-col items-center justify-end gap-1 text-primary cursor-pointer group" type="button">
            <div className="flex h-6 items-center justify-center transition-transform group-active:scale-95">
              <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
            </div>
            <p className="text-xs font-semibold leading-normal">Inicio</p>
          </button>
          <button className="flex flex-col items-center justify-end gap-1 text-slate-400 hover:text-slate-300 transition-colors cursor-pointer group" onClick={() => onNavigate('tech_history')} type="button">
            <div className="flex h-6 items-center justify-center transition-transform group-active:scale-95">
              <span className="material-symbols-outlined text-[28px]">history</span>
            </div>
            <p className="text-xs font-medium leading-normal">Historial</p>
          </button>
          <button className="flex flex-col items-center justify-end gap-1 text-slate-400 hover:text-slate-300 transition-colors cursor-pointer group" onClick={() => onNavigate('tech_profile')} type="button">
            <div className="flex h-6 items-center justify-center transition-transform group-active:scale-95">
              <span className="material-symbols-outlined text-[28px]">person</span>
            </div>
            <p className="text-xs font-medium leading-normal">Perfil</p>
          </button>
        </div>
      </nav>
    </div>
  );
}
