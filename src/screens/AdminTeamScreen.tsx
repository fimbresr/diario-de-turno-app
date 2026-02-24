import React from 'react';
import type { Screen, Technician } from '../types';

interface AdminTeamScreenProps {
  onNavigate: (screen: Screen) => void;
  technicians: Technician[];
}

export default function AdminTeamScreen({ onNavigate, technicians }: AdminTeamScreenProps) {
  return (
    <div className="min-h-screen bg-[#101922] text-white flex flex-col">
      <header className="sticky top-0 z-10 px-4 py-3 border-b border-slate-800 bg-[#101922]/95 backdrop-blur">
        <div className="flex items-center justify-between">
          <button className="text-slate-300 hover:text-white" onClick={() => onNavigate('admin_dashboard')} type="button">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-base font-bold">Equipo</h1>
          <div className="w-6"></div>
        </div>
      </header>

      <main className="p-4 pb-24 flex-1">
        <div className="flex flex-col gap-3">
          {technicians.map((tech) => (
            <article key={tech.id} className="rounded-xl border border-slate-800 bg-[#192633] p-4">
              <h2 className="font-bold">{tech.name}</h2>
              <p className="text-xs text-slate-400 mt-1">{tech.role === 'admin' ? 'Administrador' : 'Técnico'} • {tech.shift || '-'}</p>
            </article>
          ))}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-[#233648] bg-[#192633] px-4 pt-2 max-w-md mx-auto">
        <div className="flex justify-between gap-2 pb-3">
          <button className="flex flex-1 flex-col items-center gap-1 text-[#92adc9]" onClick={() => onNavigate('admin_dashboard')} type="button">
            <span className="material-symbols-outlined text-2xl">home</span>
            <span className="text-[10px]">Inicio</span>
          </button>
          <button className="flex flex-1 flex-col items-center gap-1 text-[#92adc9]" onClick={() => onNavigate('admin_dashboard')} type="button">
            <span className="material-symbols-outlined text-2xl">assignment</span>
            <span className="text-[10px]">Tareas</span>
          </button>
          <button className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 ring-4 ring-[#101922]" onClick={() => onNavigate('register_job')} type="button">
            <span className="material-symbols-outlined text-2xl">add</span>
          </button>
          <button className="flex flex-1 flex-col items-center gap-1 text-white" type="button">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
            <span className="text-[10px]">Equipo</span>
          </button>
          <button className="flex flex-1 flex-col items-center gap-1 text-[#92adc9]" onClick={() => onNavigate('admin_settings')} type="button">
            <span className="material-symbols-outlined text-2xl">settings</span>
            <span className="text-[10px]">Ajustes</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
