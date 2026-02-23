import React, { useMemo, useState, useRef } from 'react';
import SignaturePad from 'react-signature-canvas';
import type { JobDraft, Screen } from '../types';

interface FinishTaskScreenProps {
  onNavigate: (screen: Screen) => void;
  onFinalize: (signature: string) => Promise<void>;
  technicianName: string;
  draft: JobDraft;
}

export default function FinishTaskScreen({ onNavigate, onFinalize, technicianName, draft }: FinishTaskScreenProps) {
  const sigPad = useRef<SignaturePad>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const completionDate = useMemo(
    () => new Date().toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }),
    [],
  );

  const handleFinalize = async () => {
    if (!draft.workType || !draft.description || !draft.area) {
      setError('No hay un trabajo válido en proceso. Regresa a registrar la tarea.');
      return;
    }

    if (!sigPad.current || sigPad.current.isEmpty()) {
      setError('Debes dibujar tu firma para finalizar.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const signatureDataUrl = sigPad.current.getCanvas().toDataURL('image/png');
      await onFinalize(signatureDataUrl);
    } catch (finalizeError) {
      setError(finalizeError instanceof Error ? finalizeError.message : 'No se pudo finalizar la tarea.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#101922] min-h-screen flex flex-col relative text-white">
      <header className="sticky top-0 z-50 bg-[#101922]/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between h-14">
        <button onClick={() => onNavigate('register_job')} className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full active:bg-slate-800 transition-colors text-white" type="button">
          <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
        </button>
        <h1 className="text-base font-semibold tracking-tight absolute left-1/2 -translate-x-1/2">Finalizar Tarea</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-1 flex flex-col p-4 w-full gap-6">
        <section className="flex flex-col gap-2 pt-2">
          <h2 className="text-slate-400 text-sm font-medium uppercase tracking-wider pl-1">Fecha y Hora de Finalización</h2>
          <div className="bg-[#1E2936] border border-slate-700 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined">schedule</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-medium">Auto-registrado</span>
              <span className="text-lg font-bold tabular-nums text-white">{completionDate}</span>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-700 bg-[#1E2936] p-4">
          <h3 className="text-sm text-slate-300 font-semibold uppercase tracking-wide">Resumen</h3>
          <p className="text-sm mt-2"><span className="text-slate-400">Área:</span> {draft.area || 'Sin definir'}</p>
          <p className="text-sm mt-1"><span className="text-slate-400">Trabajo:</span> {draft.workType || 'Sin definir'}</p>
        </section>

        <section className="flex flex-col gap-2">
          <label className="text-slate-400 text-sm font-medium uppercase tracking-wider pl-1" htmlFor="tech-name">Técnico Responsable</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <span className="material-symbols-outlined text-[20px]">person</span>
            </div>
            <input className="block w-full pl-10 pr-3 py-3.5 rounded-xl border border-slate-700 bg-[#1E2936] text-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm" id="tech-name" readOnly type="text" value={technicianName} />
          </div>
        </section>

        <section className="flex flex-col gap-2 flex-1 min-h-[220px]">
          <div className="flex items-center justify-between pl-1 pr-1">
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Firma del Técnico</h3>
            <button className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 px-2 py-1 rounded-md hover:bg-primary/10" onClick={() => sigPad.current?.clear()} type="button" disabled={isSubmitting}>
              <span className="material-symbols-outlined text-[16px]">ink_eraser</span>
              Limpiar firma
            </button>
          </div>

          <div className="rounded-xl border border-slate-700 bg-[#E2E8F0] overflow-hidden" style={{ touchAction: 'none' }}>
            <SignaturePad
              ref={sigPad}
              canvasProps={{
                className: 'w-full h-48',
              }}
              penColor="#0f172a"
              onBegin={() => setError('')}
            />
          </div>

          <p className="text-xs text-slate-500 text-center px-4 mt-2">
            Al firmar, confirmo que la tarea ha sido completada según los estándares establecidos.
          </p>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </section>
      </main>

      <div className="sticky bottom-0 z-50 p-4 bg-[#101922]/80 backdrop-blur-xl border-t border-slate-800">
        <div className="max-w-md mx-auto w-full">
          <button onClick={handleFinalize} className="w-full bg-primary hover:bg-primary/90 active:scale-[0.98] text-white font-semibold text-lg py-4 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed" type="button" disabled={isSubmitting}>
            <span className="material-symbols-outlined group-hover:animate-pulse">check_circle</span>
            {isSubmitting ? 'Guardando...' : 'Guardar y Finalizar'}
          </button>
        </div>
        <div className="h-4"></div>
      </div>
    </div>
  );
}
