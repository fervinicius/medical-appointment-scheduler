export interface Exam {
  id: number;
  name: string;
  durationMinutes: number;
}

export interface Doctor {
  id: number;
  name: string;
  crm: string;
}

export interface Slot {
  startAt: string;
  endAt: string;
}

export interface Appointment {
  id: number;
  patientName: string;
  exam: Exam;
  doctor: Doctor;
  startAt: string;
  endAt: string;
  timezone: string;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    const headers = new Headers(init?.headers);
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new Error('Não foi possível conectar à API. Confira se o backend está rodando em http://localhost:3000.');
  }

  const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload.message.join(' ') : payload?.message;
    throw new Error(message || `A API respondeu com status ${response.status}.`);
  }
  return payload as T;
}

export const api = {
  searchExams: (search: string) => request<Exam[]>(`/exams?search=${encodeURIComponent(search)}`),
  getDoctors: () => request<Doctor[]>('/doctors'),
  getAvailability: (doctorId: number, examId: number, date: string) =>
    request<{ slots: Slot[] }>(`/appointments/availability?doctorId=${doctorId}&examId=${examId}&date=${date}`),
  createAppointment: (input: { patientName: string; examId: number; doctorId: number; startAt: string }) =>
    request<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(input) }),
};

export function formatTime(isoDate: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  }).format(new Date(isoDate));
}

export function formatDate(date: string): string {
  // Construct at noon UTC to avoid date-only parsing shifts around midnight.
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}
