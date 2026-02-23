import React, { useState } from 'react';
import type { Technician } from '../types';

interface LoginScreenProps {
  onLogin: (technicianId: string, password: string, shift: string) => Promise<boolean>;
  technicians: Technician[];
  isBootstrapping: boolean;
  backendError: string;
}

export default function LoginScreen({ onLogin, technicians, isBootstrapping, backendError }: LoginScreenProps) {
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [password, setPassword] = useState('');
  const [shift, setShift] = useState('Matutino');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedTechnician) {
      setError('Selecciona un técnico para continuar.');
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await onLogin(selectedTechnician, password, shift);

      if (!success) {
        setError('Credenciales inválidas. Verifica técnico y contraseña.');
        return;
      }

      setError('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden bg-[#101922] mx-auto">
      <header className="sticky top-0 z-10 flex items-center bg-[#101922] p-4 justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Hospital Logo" className="h-10 w-auto object-contain" />
          <h2 className="text-white text-lg font-bold leading-tight tracking-tight">Mantenimiento</h2>
        </div>
        <button className="flex items-center justify-center text-slate-500 hover:text-primary transition-colors" type="button">
          <span className="material-symbols-outlined">help</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col px-4 py-6">
        <div className="mb-8 w-full overflow-hidden rounded-2xl relative h-[200px] group">
          <div className="absolute inset-0 bg-gradient-to-t from-[#101922]/90 to-transparent z-10"></div>
          <img
            alt="Industrial maintenance"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjfoZ3I6t-r2u61eMwwtWVUZtLJ5qPKbsyaw9B7OZGFgU83pLaHI7GC_6Id5hdGcPnJT4CU1FKC61iIbJpXYOSwKuWbjZwYW_u9JH3-bPdzLBTTFviPh1HaqiEAok1MEhVYy3aSVn08yXT-RhyFFthWafPckviqq-aHq8mfe6X4CjQAuwrFh7Nnp6RgkldjZg0F5o_hSWnbUZqcpPs6zf87-7L8OZkn-peLG6NLn2rFWr7uxGXQ0xhleacty_-QbD_uHiQk6EDwQ"
          />
          <div className="absolute bottom-4 left-4 z-20">
            <p className="text-primary font-medium text-sm mb-1 uppercase tracking-wider">Turno Seleccionado</p>
            <h3 className="text-white text-xl font-bold">{shift}</h3>
          </div>
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-white tracking-tight text-3xl font-extrabold leading-tight mb-2">Inicio de Sesión</h1>
          <p className="text-slate-400 text-sm">Ingrese sus credenciales para acceder al sistema de gestión.</p>
        </div>

        <div className="mb-4 rounded-lg border border-[#324d67] bg-[#192633] px-3 py-2 text-xs text-slate-300">
          Backend activo: <span className="font-semibold text-white">Google Sheets</span>
        </div>

        {isBootstrapping && (
          <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-200 flex items-center gap-2">
            <span className="material-symbols-outlined animate-spin text-[14px]">sync</span>
            Cargando datos del sistema...
          </div>
        )}

        {backendError && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            {backendError}
          </div>
        )}

        <form className="flex flex-col gap-6 w-full" onSubmit={submitLogin}>
          <div className="flex flex-col gap-2">
            <label className="text-slate-200 text-sm font-semibold leading-normal" htmlFor="technician">
              Seleccionar Técnico
            </label>
            <div className="relative">
              <select
                className="appearance-none w-full cursor-pointer rounded-xl border border-slate-700 bg-[#192633] px-4 py-4 pr-10 text-base font-normal text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all hover:border-slate-600 h-14"
                id="technician"
                value={selectedTechnician}
                onChange={(e) => {
                  setSelectedTechnician(e.target.value);
                  setError('');
                }}
                disabled={isBootstrapping || isSubmitting}
              >
                <option disabled value="">Seleccione su nombre</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name} ({tech.role === 'admin' ? 'Admin' : 'Técnico'})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <span className="material-symbols-outlined">expand_more</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-slate-200 text-sm font-semibold leading-normal" htmlFor="password">
              Contraseña
            </label>
            <div className="relative flex items-center">
              <input
                className="w-full rounded-xl border border-slate-700 bg-[#192633] px-4 py-4 pr-12 text-base font-normal text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-500 h-14"
                id="password"
                placeholder="Ingrese su contraseña"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                disabled={isBootstrapping || isSubmitting}
              />
              <button className="absolute right-0 top-0 bottom-0 flex items-center justify-center px-4 text-slate-400 hover:text-primary transition-colors focus:outline-none" type="button">
                <span className="material-symbols-outlined text-[24px]">visibility_off</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-slate-200 text-sm font-semibold leading-normal" htmlFor="shift">
              Turno
            </label>
            <div className="relative">
              <select
                className="appearance-none w-full cursor-pointer rounded-xl border border-slate-700 bg-[#192633] px-4 py-4 pr-10 text-base font-normal text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all hover:border-slate-600 h-14"
                id="shift"
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                disabled={isBootstrapping || isSubmitting}
              >
                <option value="Matutino">Matutino</option>
                <option value="Nocturno">Nocturno</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <span className="material-symbols-outlined">expand_more</span>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button className="mt-1 flex w-full items-center justify-center rounded-xl bg-primary py-4 px-6 text-base font-bold text-white shadow-lg shadow-primary/20 hover:bg-blue-600 active:scale-[0.98] transition-all h-14 disabled:opacity-70 disabled:cursor-not-allowed" type="submit" disabled={isBootstrapping || isSubmitting}>
            <span className="mr-2">{isSubmitting ? 'Validando...' : 'Iniciar Sesión'}</span>
            <span className="material-symbols-outlined text-sm">login</span>
          </button>
        </form>

        <div className="mt-auto pt-8 flex flex-col items-center gap-4">
          <a className="text-sm font-medium text-slate-500 hover:text-primary transition-colors flex items-center gap-1" href="#">
            <span className="material-symbols-outlined text-[18px]">lock_reset</span>
            ¿Olvidaste tu contraseña?
          </a>
          <p className="text-xs text-slate-500">v2.4.0 • Mantenimiento App</p>
          <p className="text-[11px] text-slate-600">Demo: Carlos / 1234, Rene / admin123</p>
        </div>
      </main>
    </div>
  );
}
