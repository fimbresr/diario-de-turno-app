import React from 'react';
import type { Job, Screen } from '../types';

interface TechProfileScreenProps {
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  technicianName: string;
  shift: string;
  jobs: Job[];
}

export default function TechProfileScreen({ onNavigate, onLogout, technicianName, shift, jobs }: TechProfileScreenProps) {
  const completed = jobs.length;

  return (
    <div className="min-h-screen bg-[#101922] text-white flex flex-col">
      <header className="sticky top-0 z-10 px-4 py-3 border-b border-slate-800 bg-[#101922]/95 backdrop-blur">
        <div className="flex items-center justify-between">
          <button className="text-slate-300 hover:text-white" onClick={() => onNavigate('tech_dashboard')} type="button">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-base font-bold">Perfil</h1>
          <button className="text-slate-300 hover:text-white" onClick={onLogout} type="button">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      <main className="p-4 pb-24 flex-1 flex flex-col gap-4">
        <section className="rounded-xl border border-slate-800 bg-[#192633] p-4">
          <h2 className="text-lg font-bold">{technicianName}</h2>
          <p className="text-sm text-slate-400">{shift}</p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-800 bg-[#192633] p-4">
            <p className="text-xs text-slate-400 uppercase">Trabajos</p>
            <p className="text-2xl font-bold mt-1">{jobs.length}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#192633] p-4">
            <p className="text-xs text-slate-400 uppercase">Completados</p>
            <p className="text-2xl font-bold mt-1">{completed}</p>
          </div>
        </section>

        <button
          className="rounded-xl border border-[#324d67] bg-[#192633] py-3 text-sm hover:bg-[#233648]"
          onClick={() => onNavigate('register_job')}
          type="button"
        >
          Registrar nuevo trabajo
        </button>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-[#233648] bg-[#192633] px-6 pb-6 pt-3 z-20 max-w-md mx-auto">
        <div className="flex justify-between items-center">
          <button className="flex flex-col items-center gap-1 text-slate-400" onClick={() => onNavigate('tech_dashboard')} type="button">
            <span className="material-symbols-outlined text-[28px]">home</span>
            <p className="text-xs">Inicio</p>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400" onClick={() => onNavigate('tech_history')} type="button">
            <span className="material-symbols-outlined text-[28px]">history</span>
            <p className="text-xs">Historial</p>
          </button>
          <button className="flex flex-col items-center gap-1 text-primary" type="button">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            <p className="text-xs font-semibold">Perfil</p>
          </button>
        </div>
      </nav>
    </div>
  );
}
