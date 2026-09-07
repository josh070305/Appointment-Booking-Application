import mongoose, { Document, Schema } from 'mongoose';
import { ISlot } from './Slot.js';
import { IUser } from './User.js';

export type AppointmentStatus = 'BOOKED' | 'CANCELLED' | 'COMPLETED';

export interface IAppointment extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId | IUser;
  slotId: mongoose.Types.ObjectId | ISlot;
  status: AppointmentStatus;
  notes?: string;
  bookedAt: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    slotId: {
      type: Schema.Types.ObjectId,
      ref: 'Slot',
      required: [true, 'Slot ID is required'],
      index: true
    },
    status: {
      type: String,
      enum: ['BOOKED', 'CANCELLED', 'COMPLETED'],
      default: 'BOOKED',
      index: true
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    bookedAt: {
      type: Date,
      default: Date.now
    },
    cancelledAt: {
      type: Date
    },
    cancellationReason: {
      type: String,
      trim: true
    },
    idempotencyKey: {
      type: String,
      trim: true,
      maxlength: 128
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

AppointmentSchema.index({ userId: 1, status: 1 });
AppointmentSchema.index({ slotId: 1, status: 1 });
// A retry key is unique per patient, preventing retried network requests from
// ever creating a second appointment. We use a partial index on string values so
// documents without an idempotency key (or undefined/null) are completely excluded.
AppointmentSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);
