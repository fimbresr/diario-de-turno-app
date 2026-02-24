import React, { useMemo, useState } from 'react';
import type { JobDraft, Screen } from '../types';

interface RegisterJobScreenProps {
  onNavigate: (screen: Screen) => void;
  initialDraft: JobDraft;
  onContinue: (draft: JobDraft) => void;
  homeScreen: Screen;
}

const emptyArea = '';
const workAreas = [
  'Edificio Principal Nivel 1',
  'Edificio Principal Nivel 2',
  'Edificio Principal Nivel 3',
  'Edificio Principal Nivel 4',
  'Edificio Servicios N1',
  'Edificio Servicios N2',
  'Edificio Servicios N3',
  'Edificio Servicios N4',
  'Cubierta',
  'Estacionamiento Medicos',
  'Estacionamiento Principal',
  'Estacionamiento Juarez',
  'Escaleras de Servicio',
  'Escaleras de Emergencia',
] as const;

const workTypes = [
  'Electrico',
  'Hidraulico',
  'Civil (pintura, Reparacion de Muros, Pisos, Techos)',
  'Herreria',
  'Mantenimiento Correctivo',
  'Mantenimiento Preventivo',
  'Mobiliario',
] as const;

const maxUploadFileBytes = 10 * 1024 * 1024;
const maxEncodedImageBytes = 1_500_000;
const maxImageSide = 1280;
const imageQuality = 0.72;

function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] || '';
  return Math.ceil((base64.length * 3) / 4);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string) || '');
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

function compressDataUrlImage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const ratio = Math.min(1, maxImageSide / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * ratio));
      const height = Math.max(1, Math.round(image.height * ratio));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('No se pudo procesar la imagen.'));
        return;
      }

      ctx.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', imageQuality));
    };
    image.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
    image.src = dataUrl;
  });
}

export default function RegisterJobScreen({ onNavigate, initialDraft, onContinue, homeScreen }: RegisterJobScreenProps) {
  const [form, setForm] = useState<JobDraft>(initialDraft);
  const [error, setError] = useState('');

  const descriptionCount = form.description.length;

  const canContinue = useMemo(() => {
    return (
      form.area !== emptyArea
      && form.workType.trim().length > 2
      && form.description.trim().length > 10
      && form.beforePhoto !== null
      && form.afterPhoto !== null
    );
  }, [form]);

  const updateField = <K extends keyof JobDraft>(field: K, value: JobDraft[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleFileChange = async (field: 'beforePhoto' | 'afterPhoto', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxUploadFileBytes) {
      setError('La imagen es muy grande. Intenta con una imagen de menos de 10MB.');
      e.target.value = '';
      return;
    }

    try {
      const rawDataUrl = await fileToDataUrl(file);
      const compressedDataUrl = await compressDataUrlImage(rawDataUrl);

      if (estimateDataUrlBytes(compressedDataUrl) > maxEncodedImageBytes) {
        setError('La foto sigue siendo pesada. Intenta tomarla con menor resolución.');
        e.target.value = '';
        return;
      }

      updateField(field, compressedDataUrl);
    } catch {
      setError('Ocurrió un error al procesar la imagen.');
    } finally {
      e.target.value = '';
    }
  };

  const goNext = () => {
    if (!canContinue) {
      setError('Completa área, tipo, descripción y evidencia fotográfica para continuar.');
      return;
    }

    onContinue(form);
    onNavigate('finish_task');
  };

  return (
    <div className="bg-[#101922] min-h-screen flex flex-col relative">
      <header className="sticky top-0 z-50 bg-[#111a22] border-b border-[#324d67] backdrop-blur-md bg-opacity-95">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => onNavigate(homeScreen)} className="flex w-16 items-center justify-start text-[#92adc9] active:text-white transition-colors" type="button">
            <span className="text-base font-medium">Cancelar</span>
          </button>
          <h1 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] truncate">Registrar Trabajo</h1>
          <button onClick={goNext} className="flex w-16 items-center justify-end text-primary font-bold active:text-primary/80 transition-colors" type="button">
            <span className="text-base">Siguiente</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-6 p-4 pb-24 w-full">
        <section className="flex flex-col gap-4">
          <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Información General</h2>

          <div className="flex flex-col gap-2">
            <label className="text-white text-sm font-medium leading-normal" htmlFor="work-area">Área de Trabajo</label>
            <div className="relative">
              <select
                id="work-area"
                className="w-full appearance-none rounded-lg bg-[#192633] border border-[#324d67] text-white h-12 px-4 pr-10 focus:ring-2 focus:ring-primary outline-none text-base"
                value={form.area}
                onChange={(e) => updateField('area', e.target.value)}
              >
                <option disabled value="">Seleccionar Área</option>
                {!workAreas.includes(form.area as (typeof workAreas)[number]) && form.area && (
                  <option value={form.area}>{form.area}</option>
                )}
                {workAreas.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#92adc9]">
                <span className="material-symbols-outlined">expand_more</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-white text-sm font-medium leading-normal" htmlFor="work-type">Tipo de Trabajo</label>
            <div className="relative">
              <select
              id="work-type"
              className="w-full appearance-none rounded-lg bg-[#192633] border border-[#324d67] text-white h-12 px-4 pr-10 focus:ring-2 focus:ring-primary outline-none text-base"
              value={form.workType}
              onChange={(e) => updateField('workType', e.target.value)}
              >
                <option disabled value="">Seleccionar Tipo</option>
                {!workTypes.includes(form.workType as (typeof workTypes)[number]) && form.workType && (
                  <option value={form.workType}>{form.workType}</option>
                )}
                {workTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#92adc9]">
                <span className="material-symbols-outlined">expand_more</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-white text-sm font-medium leading-normal" htmlFor="work-desc">Descripción del Problema</label>
            <textarea
              id="work-desc"
              className="w-full rounded-lg bg-[#192633] border border-[#324d67] text-white placeholder-[#92adc9] min-h-[120px] p-4 focus:ring-2 focus:ring-primary outline-none text-base resize-none"
              placeholder="Describe el trabajo realizado con detalle..."
              value={form.description}
              maxLength={500}
              onChange={(e) => updateField('description', e.target.value)}
            ></textarea>
            <div className="text-right text-xs text-[#92adc9]">{descriptionCount}/500 caracteres</div>
          </div>
        </section>

        <div className="h-px bg-[#324d67] w-full"></div>

        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Evidencia Fotográfica</h2>
            <span className="text-xs text-[#92adc9] bg-[#192633] px-2 py-1 rounded">Requerido</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#92adc9]">Foto Antes</span>
              <label
                className={`group relative flex flex-col items-center justify-center w-full aspect-square rounded-xl border-2 border-dashed transition-colors overflow-hidden cursor-pointer ${form.beforePhoto ? 'border-primary bg-[#192633]' : 'border-[#324d67] bg-[#192633] hover:bg-[#1f2f3f]'
                  }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange('beforePhoto', e)}
                />
                {form.beforePhoto ? (
                  <img src={form.beforePhoto} alt="Foto Antes" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 group-hover:scale-105 transition-transform duration-200">
                    <div className="flex gap-2">
                      <span className="material-symbols-outlined text-[#92adc9] group-hover:text-primary text-3xl">photo_camera</span>
                      <span className="material-symbols-outlined text-[#92adc9] group-hover:text-primary text-3xl">photo_library</span>
                    </div>
                    <span className="text-xs text-[#92adc9] font-medium text-center px-2">Cámara o Galería</span>
                  </div>
                )}
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#92adc9]">Foto Después</span>
              <label
                className={`group relative flex flex-col items-center justify-center w-full aspect-square rounded-xl border-2 border-dashed transition-colors overflow-hidden cursor-pointer ${form.afterPhoto ? 'border-primary bg-[#192633]' : 'border-[#324d67] bg-[#192633] hover:bg-[#1f2f3f]'
                  }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange('afterPhoto', e)}
                />
                {form.afterPhoto ? (
                  <img src={form.afterPhoto} alt="Foto Después" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 group-hover:scale-105 transition-transform duration-200">
                    <div className="flex gap-2">
                      <span className="material-symbols-outlined text-[#92adc9] group-hover:text-primary text-3xl">photo_camera</span>
                      <span className="material-symbols-outlined text-[#92adc9] group-hover:text-primary text-3xl">photo_library</span>
                    </div>
                    <span className="text-xs text-[#92adc9] font-medium text-center px-2">Cámara o Galería</span>
                  </div>
                )}
              </label>
            </div>
          </div>
        </section>

        <div className="h-px bg-[#324d67] w-full"></div>

        <section className="flex flex-col gap-4">
          <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Cierre del Reporte</h2>
          <div className="flex flex-col gap-2">
            <label className="text-white text-sm font-medium leading-normal" htmlFor="extra-comments">
              Comentarios Adicionales <span className="text-[#92adc9] font-normal">(Opcional)</span>
            </label>
            <textarea
              id="extra-comments"
              className="w-full rounded-lg bg-[#192633] border border-[#324d67] text-white placeholder-[#92adc9] min-h-[80px] p-4 focus:ring-2 focus:ring-primary outline-none text-base resize-none"
              placeholder="Observaciones extra..."
              value={form.additionalComments}
              onChange={(e) => updateField('additionalComments', e.target.value)}
            ></textarea>
          </div>
        </section>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#111a22] border-t border-[#324d67] backdrop-blur-xl bg-opacity-95 flex justify-center z-40">
        <button onClick={goNext} className="w-full max-w-md bg-primary hover:bg-blue-600 text-white font-bold py-3.5 px-6 rounded-lg shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base" type="button">
          Continuar
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
