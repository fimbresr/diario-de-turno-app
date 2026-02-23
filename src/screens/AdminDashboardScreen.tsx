import React, { useState } from 'react';
import type { Job, Screen } from '../types';

interface AdminDashboardScreenProps {
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  jobs: Job[];
  adminName: string;
  onEditJob: (job: Job) => void;
  onDeleteJob: (jobId: string) => Promise<void>;
  onExportJob: (job: Job) => Promise<void>;
  isSyncing: boolean;
  onSyncPending: () => Promise<void>;
}

type TaskVisual = 'blue' | 'orange' | 'purple' | 'teal';

const visualStyles: Record<TaskVisual, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-500' },
};

function inferVisual(workType: string): TaskVisual {
  const lower = workType.toLowerCase();
  if (lower.includes('elect') || lower.includes('generador')) return 'orange';
  if (lower.includes('agua') || lower.includes('plomer')) return 'teal';
  if (lower.includes('inspec') || lower.includes('revision')) return 'purple';
  return 'blue';
}

function inferIcon(workType: string): string {
  const lower = workType.toLowerCase();
  if (lower.includes('agua') || lower.includes('plomer')) return 'plumbing';
  if (lower.includes('elect') || lower.includes('lumin') || lower.includes('generador')) return 'bolt';
  if (lower.includes('aire') || lower.includes('hvac') || lower.includes('a/c')) return 'hvac';
  return 'engineering';
}

export default function AdminDashboardScreen({ onNavigate, onLogout, jobs, adminName, onEditJob, onDeleteJob, onExportJob, isSyncing, onSyncPending }: AdminDashboardScreenProps) {
  const pendingSync = jobs.filter(j => j.syncStatus === 'pending').length;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => setConfirmDeleteId(id);
  const confirmDelete = () => {
    if (confirmDeleteId) {
      onDeleteJob(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const today = new Date().toDateString();
  const todayJobsCount = jobs.filter((job) => new Date(job.finishedAt).toDateString() === today).length;

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden pb-20 bg-[#101922]">
      <header className="sticky top-0 z-10 border-b border-[#233648] bg-[#101922]/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#233648] bg-[#192633]">
              <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
            </div>
            <div>
              <h2 className="text-sm font-medium text-[#92adc9]">Bienvenido de nuevo,</h2>
              <h1 className="text-lg font-bold leading-tight text-white">{adminName}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#192633] text-white hover:bg-[#233648] transition-colors relative" type="button">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-[#192633]"></span>
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#192633] text-white hover:bg-[#233648] transition-colors" onClick={onLogout} type="button">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col rounded-xl border border-[#233648] bg-[#192633] p-3">
              <p className="text-xs font-medium text-[#92adc9]">Historial Total</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold text-white">{jobs.length}</span>
              </div>
            </div>
            <div className="flex flex-col rounded-xl border border-[#233648] bg-[#192633] p-3">
              <p className="text-xs font-medium text-[#92adc9]">Tareas Hoy</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold text-white">{todayJobsCount}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex w-full flex-col gap-4 px-4 py-4">
        <button
          onClick={onSyncPending}
          disabled={isSyncing}
          className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl border shadow-lg transition-all active:scale-[0.98] group disabled:opacity-50 ${pendingSync > 0
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
              ? 'Sincronizando...'
              : pendingSync > 0
                ? `Sincronizar la Nube (${pendingSync} pendientes)`
                : 'Todo sincronizado ✓'}
          </span>
        </button>

        <div className="flex items-center justify-between mt-2">
          <h3 className="text-base font-bold text-white">Registro de Tareas Realizadas</h3>
        </div>
      </div>

      <main className="flex flex-1 flex-col gap-3 px-4">
        {jobs.length === 0 && (
          <div className="rounded-xl border border-[#233648] bg-[#192633] p-4 text-sm text-[#92adc9]">No hay resultados para este filtro.</div>
        )}

        {jobs.map((task) => {
          const visual = inferVisual(task.workType);
          return (
            <div key={task.id} className="group relative flex flex-col gap-3 rounded-xl border border-[#233648] bg-[#192633] p-4 transition-all hover:border-primary/50">
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500`}>
                    <span className="material-symbols-outlined">{inferIcon(task.workType)}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white">{task.workType}</h4>
                    </div>
                    <p className="mt-0.5 text-xs text-[#92adc9]">{task.shift} • Tech: {task.technicianName}</p>
                  </div>
                </div>
                <p className="text-xs font-medium text-[#92adc9]">{new Date(task.finishedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="mt-1 flex flex-col gap-3 border-t border-[#233648] pt-3">
                <div className="flex items-center justify-between min-h-[32px]">
                  <p className="text-xs text-slate-400 truncate max-w-[60%]">{task.area}</p>
                  {task.signature?.startsWith('data:image/') ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 uppercase">Firma:</span>
                      <img src={task.signature} alt="Firma" className="h-6 bg-white/90 rounded object-contain px-1" />
                    </div>
                  ) : (
                    <span className="text-xs italic text-slate-300 font-serif">Firma: {task.signature || 'N/A'}</span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => onExportJob(task)} className="flex h-8 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20" type="button" title="Exportar">
                    <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                    Exportar
                  </button>
                  <button onClick={() => onEditJob(task)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/50 text-slate-300 hover:text-white transition-colors" type="button" title="Editar">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button onClick={() => handleDelete(task.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors" type="button" title="Borrar">
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-[#233648] bg-[#192633] px-4 pt-2 max-w-md mx-auto">
        <div className="flex justify-between gap-2 pb-3">
          <button className="flex flex-1 flex-col items-center justify-end gap-1 rounded-full text-white" type="button">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
            <span className="text-[10px] font-medium leading-normal tracking-wide">Inicio</span>
          </button>
          <button className="flex flex-1 flex-col items-center justify-end gap-1 text-[#92adc9] hover:text-white transition-colors" onClick={() => onNavigate('admin_dashboard')} type="button">
            <span className="material-symbols-outlined text-2xl">assignment</span>
            <span className="text-[10px] font-medium leading-normal tracking-wide">Tareas</span>
          </button>
          <div className="relative -top-5 flex flex-col items-center justify-end">
            <button className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 ring-4 ring-[#101922]" onClick={() => onNavigate('register_job')} type="button">
              <span className="material-symbols-outlined text-2xl">add</span>
            </button>
          </div>
          <button className="flex flex-1 flex-col items-center justify-end gap-1 text-[#92adc9] hover:text-white transition-colors" onClick={() => onNavigate('admin_team')} type="button">
            <span className="material-symbols-outlined text-2xl">group</span>
            <span className="text-[10px] font-medium leading-normal tracking-wide">Equipo</span>
          </button>
          <button className="flex flex-1 flex-col items-center justify-end gap-1 text-[#92adc9] hover:text-white transition-colors" onClick={() => onNavigate('admin_settings')} type="button">
            <span className="material-symbols-outlined text-2xl">settings</span>
            <span className="text-[10px] font-medium leading-normal tracking-wide">Ajustes</span>
          </button>
        </div>
      </nav>
      {/* Modal de confirmación de borrado */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-[#192633] p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                <span className="material-symbols-outlined text-red-500">delete_forever</span>
              </div>
              <h3 className="text-base font-bold text-white">¿Borrar tarea?</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6">Esta acción eliminará el registro de forma permanente en todos los dispositivos. No se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-sm transition-colors"
                type="button"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white font-semibold text-sm transition-all"
                type="button"
              >
                Sí, borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
