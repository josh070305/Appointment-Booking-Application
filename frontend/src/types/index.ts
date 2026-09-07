export type SlotStatus = 'AVAILABLE' | 'BOOKED';
export type AppointmentStatus = 'BOOKED' | 'CANCELLED' | 'COMPLETED';

export interface ISlot {
  _id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  serviceName: string;
  providerName: string;
  location: string;
  durationMinutes: number;
  price: number;
  status: SlotStatus;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

export interface IAppointment {
  _id: string;
  userId: string | IUser;
  slotId: ISlot;
  status: AppointmentStatus;
  notes?: string;
  bookedAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
  isPast?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IAvailableDate {
  date: string;
  availableCount: number;
  services: string[];
}

export interface IAssistantResult {
  date?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  service?: string;
  summary: string;
  source: 'gemini' | 'heuristic';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
