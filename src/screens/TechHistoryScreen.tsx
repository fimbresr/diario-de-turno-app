import React, { useState } from 'react';
import type { Job, Role, Screen } from '../types';

interface TechHistoryScreenProps {
  jobs: Job[];
  onNavigate: (screen: Screen) => void;
  technicianName: string;
  userRole: Role;
  onEditJob: (job: Job) => void;
  onDeleteJob: (jobId: string) => Promise<void>;
  onExportJob: (job: Job) => Promise<void>;
  isSyncing: boolean;
  onSyncPending: () => Promise<void>;
}



export default function TechHistoryScreen({ jobs, onNavigate, technicianName, userRole, onEditJob, onDeleteJob, onExportJob, isSyncing, onSyncPending }: TechHistoryScreenProps) {
  const isAdmin = userRole === 'admin';
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => setConfirmDeleteId(id);
  const confirmDelete = () => {
    if (confirmDeleteId) {
      onDeleteJob(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };
  const pendingSync = jobs.filter(j => j.syncStatus === 'pending').length;

  return (
    <div className="min-h-screen bg-[#101922] text-white flex flex-col">
      <header className="sticky top-0 z-10 px-4 py-3 border-b border-slate-800 bg-[#101922]/95 backdrop-blur">
        <div className="flex items-center justify-between">
          <button
            className="text-slate-300 hover:text-white"
            onClick={() => onNavigate('tech_dashboard')}
            type="button"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-base font-bold">Historial</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={onSyncPending}
              disabled={isSyncing}
              title={pendingSync > 0 ? `Sincronizar (${pendingSync} pendientes)` : 'Todo sincronizado'}
              className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-800 transition-colors disabled:opacity-50"
              type="button"
            >
              {isSyncing ? (
                <span className="material-symbols-outlined animate-spin text-primary text-[22px]">sync</span>
              ) : pendingSync > 0 ? (
                <span className="material-symbols-outlined text-amber-400 text-[22px]">cloud_upload</span>
              ) : (
                <span className="material-symbols-outlined text-green-400 text-[22px]">cloud_done</span>
              )}
            </button>
            <button className="text-slate-300 hover:text-white" onClick={() => onNavigate('tech_profile')} type="button">
              <span className="material-symbols-outlined">person</span>
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24 flex-1">
        <p className="text-sm text-slate-400 mb-4">Registros de {technicianName}</p>

        <div className="flex flex-col gap-3">
          {jobs.length === 0 && (
            <div className="rounded-xl border border-slate-800 bg-[#192633] p-4 text-slate-400 text-sm">
              No hay trabajos registrados todavía.
            </div>
          )}

          {jobs.map((job) => (
            <article key={job.id} className="rounded-xl border border-slate-800 bg-[#192633] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold">{job.workType}</h2>
                  <p className="text-xs text-slate-400">{job.area}</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 mt-3">{job.description}</p>

              <div className="mt-3 py-2 px-3 border border-slate-700/50 bg-slate-800/30 rounded-lg flex items-center justify-between min-h-[44px]">
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Firma</span>
                {job.signature?.startsWith('data:image/') ? (
                  <img src={job.signature} alt="Firma" className="h-10 bg-white/90 rounded object-contain px-1" />
                ) : (
                  <span className="text-xs italic text-slate-300 font-serif">{job.signature || '(Sin firma)'}</span>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 border-t border-slate-800 pt-3">
                <div className="flex flex-col gap-0.5">
                  <p className="text-[11px] text-slate-500">
                    {new Date(job.finishedAt).toLocaleString('es-MX')}
                  </p>
                  {job.syncStatus === 'pending' && (
                    <span className="text-[10px] text-amber-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">cloud_upload</span>Pendiente de sync
                    </span>
                  )}
                  {job.syncStatus === 'synced' && (
                    <span className="text-[10px] text-green-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">cloud_done</span>Sincronizado
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {isAdmin && (
                    <button onClick={() => onExportJob(job)} className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Exportar a PDF">
                      <span className="material-symbols-outlined text-[16px]">print</span>
                    </button>
                  )}
                  <button onClick={() => onEditJob(job)} className="flex h-7 w-7 items-center justify-center rounded bg-slate-700/50 text-slate-300 hover:text-white transition-colors" title="Editar">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  {isAdmin && (
                    <button onClick={() => handleDelete(job.id)} className="flex h-7 w-7 items-center justify-center rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors" title="Borrar">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-[#233648] bg-[#192633] px-6 pb-6 pt-3 z-20 max-w-md mx-auto">
        <div className="flex justify-between items-center">
          <button className="flex flex-col items-center gap-1 text-slate-400" onClick={() => onNavigate('tech_dashboard')} type="button">
            <span className="material-symbols-outlined text-[28px]">home</span>
            <p className="text-xs">Inicio</p>
          </button>
          <button className="flex flex-col items-center gap-1 text-primary" type="button">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
            <p className="text-xs font-semibold">Historial</p>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400" onClick={() => onNavigate('tech_profile')} type="button">
            <span className="material-symbols-outlined text-[28px]">person</span>
            <p className="text-xs">Perfil</p>
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
