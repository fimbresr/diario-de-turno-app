import type { Job, Technician } from '../types';

const tokenStorageKey = 'diario_turno_token_v1';
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

let authToken: string | null = null;

if (typeof window !== 'undefined') {
  authToken = window.localStorage.getItem(tokenStorageKey);
}

function setStoredToken(token: string | null) {
  authToken = token;

  if (typeof window === 'undefined') return;

  if (token) {
    window.localStorage.setItem(tokenStorageKey, token);
  } else {
    window.localStorage.removeItem(tokenStorageKey);
  }
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('La respuesta del backend no es JSON válido.');
  }
}

async function request<T>(path: string, init: RequestInit = {}, requiresAuth = true): Promise<T> {
  const headers = new Headers(init.headers || {});

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (requiresAuth && authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    const errorMessage =
      typeof payload === 'object'
      && payload !== null
      && 'error' in payload
      && typeof (payload as { error?: { message?: string } }).error?.message === 'string'
        ? (payload as { error: { message: string } }).error.message
        : `Error HTTP ${response.status}`;

    if (response.status === 401) {
      setStoredToken(null);
    }

    throw new Error(errorMessage);
  }

  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

export function clearAuthToken() {
  setStoredToken(null);
}

export function hasAuthToken(): boolean {
  return Boolean(authToken);
}

export async function fetchTechniciansFromBackend(): Promise<Technician[]> {
  const technicians = await request<Array<Pick<Technician, 'id' | 'name' | 'role'>>>('/public/technicians', { method: 'GET' }, false);

  return technicians.map((tech) => ({
    ...tech,
    shift: '',
  }));
}

export async function loginAgainstBackend(technicianId: string, password: string, shift: string): Promise<Technician> {
  const data = await request<{
    token: string;
    user: Technician;
  }>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ technicianId, password, shift }),
    },
    false,
  );

  setStoredToken(data.token);
  return data.user;
}

export async function fetchJobsFromBackend(): Promise<Job[]> {
  return request<Job[]>('/tasks', { method: 'GET' });
}

export async function upsertJobInBackend(job: Job): Promise<void> {
  await request<Job>(`/tasks/${encodeURIComponent(job.id)}`, {
    method: 'PUT',
    body: JSON.stringify(job),
  });
}

export async function deleteJobInBackend(jobId: string): Promise<void> {
  await request(`/tasks/${encodeURIComponent(jobId)}`, {
    method: 'DELETE',
  });
}
