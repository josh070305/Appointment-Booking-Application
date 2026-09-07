import mongoose, { Document, Schema } from 'mongoose';

export type SlotStatus = 'AVAILABLE' | 'BOOKED';

export interface ISlot extends Document {
  _id: mongoose.Types.ObjectId;
  date: string; // ISO format 'YYYY-MM-DD'
  startTime: string; // e.g. '09:00' or ISO timestamp
  endTime: string; // e.g. '09:45' or ISO timestamp
  serviceName: string; // e.g. 'General Consultation', 'Dental Checkup'
  providerName: string; // e.g. 'Dr. Sarah Smith'
  location: string; // e.g. 'Room 302, Medical Wing' or 'Online Video'
  durationMinutes: number;
  price: number;
  status: SlotStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const SlotSchema = new Schema<ISlot>(
  {
    date: {
      type: String,
      required: [true, 'Date is required (YYYY-MM-DD)'],
      index: true
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required']
    },
    serviceName: {
      type: String,
      required: true,
      default: 'General Consultation'
    },
    providerName: {
      type: String,
      required: true,
      default: 'Dr. Sarah Smith'
    },
    location: {
      type: String,
      default: 'In-Clinic (Suite 401)'
    },
    durationMinutes: {
      type: Number,
      default: 30
    },
    price: {
      type: Number,
      default: 50
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'BOOKED'],
      default: 'AVAILABLE',
      index: true
    },
    version: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    versionKey: 'version'
  }
);

// Compound index for super fast queries: finding available slots by date
SlotSchema.index({ date: 1, status: 1 });
SlotSchema.index({ serviceName: 1 });

export const Slot = mongoose.model<ISlot>('Slot', SlotSchema);
