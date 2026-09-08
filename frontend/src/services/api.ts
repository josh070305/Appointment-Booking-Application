import { ApiResponse, ISlot, IAppointment, IAvailableDate, IAssistantResult, IUser } from '../types/index.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Store the CSRF token so other modules can access it
let csrfToken: string | null = null;

/**
 * Fetch the CSRF token from the server and cache it.
 * Call on app startup or when the token might have expired.
 */
export async function fetchCsrfToken(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/csrf-token`, {
      credentials: 'include' // send httpOnly cookies (jwt + xsrf)
    });
    if (res.ok) {
      const data = (await res.json()) as { csrfToken: string | undefined };
      csrfToken = data.csrfToken || null;
    }
  } catch (err) {
    console.warn('Failed to fetch CSRF token', err);
  }
}

/** Get the current cached CSRF token (always returns a string, possibly empty) */
export function getCsrfToken(): string {
  return csrfToken || '';
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(getCsrfToken() ? { 'X-XSRF-Token': getCsrfToken() } : {})
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    ...getAuthHeaders(),
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });

  const data: ApiResponse<T> = await response.json();

  if (!response.ok || !data.success) {
    const error: any = new Error(data.error?.message || 'Something went wrong');
    error.status = response.status;
    error.code = data.error?.code || 'UNKNOWN_ERROR';
    error.details = data.error?.details;
    throw error;
  }

  return data.data as T;
}

export const api = {
  // Auth
  register: (payload: { name: string; email: string; password: string }) =>
    request<{ token: string; user: IUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  login: (payload: { email: string; password: string }) =>
    request<{ token: string; user: IUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  demoLogin: (payload?: { email?: string; name?: string }) =>
    request<{ token: string; user: IUser }>('/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify(payload || {})
    }),

  getMe: () =>
    request<{ user: IUser }>('/api/auth/me'),

  // Utilities
  fetchCsrfToken,

  // Slots
  getSlots: (params?: { date?: string; service?: string; status?: string; timeOfDay?: string }) => {
    const query = new URLSearchParams();
    if (params?.date) query.append('date', params.date);
    if (params?.service) query.append('service', params.service);
    if (params?.status) query.append('status', params.status);
    if (params?.timeOfDay) query.append('timeOfDay', params.timeOfDay);
    return request<{ total: number; slots: ISlot[] }>(`/api/slots?${query.toString()}`);
  },

  getAvailableDates: () =>
    request<{ dates: IAvailableDate[] }>('/api/slots/dates'),

  getSlotById: (id: string) =>
    request<{ slot: ISlot }>(`/api/slots/${id}`),

  // Appointments
  bookAppointment: (payload: { slotId: string; notes?: string }, customToken?: string) =>
    request<{ appointment: IAppointment; slot: ISlot; status: string }>('/api/appointments', {
      method: 'POST',
      headers: customToken ? { Authorization: `Bearer ${customToken}` } : {},
      body: JSON.stringify(payload)
    }),

  getUserAppointments: (filter?: 'upcoming' | 'past' | 'all') => {
    const query = filter ? `?filter=${filter}` : '';
    return request<{ total: number; appointments: IAppointment[] }>(`/api/appointments${query}`);
  },

  getAppointmentById: (id: string) =>
    request<{ appointment: IAppointment }>(`/api/appointments/${id}`),

  cancelAppointment: (id: string, reason?: string) =>
    request<{ message: string; appointment: IAppointment }>(`/api/appointments/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }),

  // Assistant
  parseAssistantQuery: (query: string) =>
    request<IAssistantResult>('/api/assistant/parse', {
      method: 'POST',
      body: JSON.stringify({ query })
    })
};
