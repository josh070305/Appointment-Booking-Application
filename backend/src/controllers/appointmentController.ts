import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Slot } from '../models/Slot.js';
import { Appointment } from '../models/Appointment.js';
import { AppError } from '../middleware/errorHandler.js';
import { broadcastSlotUpdate } from '../socket.js';
import { logger } from '../utils/logger.js';

export const bookAppointmentSchema = z.object({
  slotId: z.string().min(1, 'Slot ID is required'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').nullish().optional()
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().max(300, 'Reason cannot exceed 300 characters').nullish().optional()
});

export async function bookAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { slotId, notes } = req.body;
  const userId = req.user?.userId;
  const idempotencyKey = typeof req.header('Idempotency-Key') === 'string'
    ? req.header('Idempotency-Key')!.trim().slice(0, 128)
    : undefined;

  if (!userId) {
    return next(new AppError(401, 'UNAUTHORIZED', 'You must be logged in to book an appointment.'));
  }

  try {
    // A successful prior request with the same key is returned unchanged.
    // This makes a safe client retry indistinguishable from the original call.
    if (idempotencyKey) {
      const existing = await Appointment.findOne({ userId, idempotencyKey })
        .populate('slotId')
        .populate('userId', 'name email');
      if (existing) {
        res.status(200).json({
          success: true,
          data: { appointment: existing, slot: existing.slotId, status: existing.status, idempotentReplay: true }
        });
        return;
      }
    }

    // 1. Check if the slot exists and is in the future
    const targetSlot = await Slot.findById(slotId);
    if (!targetSlot) {
      throw new AppError(404, 'SLOT_NOT_FOUND', 'The requested slot does not exist.');
    }

    // Verify slot is not in the past
    const now = new Date();
    const slotDateTime = new Date(`${targetSlot.date}T${targetSlot.startTime}:00`);
    if (slotDateTime < now) {
      throw new AppError(400, 'PAST_SLOT_CANNOT_BE_BOOKED', 'Cannot book a time slot in the past.');
    }

    // OVERLAP VALIDATION: Prevent booking slots that overlap with user's existing bookings
    if (targetSlot.status === 'BOOKED') {
      const existingAppointments = await Appointment.find({ userId, status: 'BOOKED' })
        .populate('slotId')
        .lean();

      for (const existingApt of existingAppointments) {
        const existingSlot = existingApt.slotId as any;
        if (!existingSlot) continue;

        // Check for overlap: two intervals overlap if neither is entirely before the other
        const thisStart = new Date(`${targetSlot.date}T${targetSlot.startTime}:00`);
        const thisEnd = new Date(`${targetSlot.date}T${targetSlot.endTime}:00`);
        const existingStart = new Date(`${existingSlot.date}T${existingSlot.startTime}:00`);
        const existingEnd = new Date(`${existingSlot.date}T${existingSlot.endTime}:00`);

        if (thisStart < existingEnd && thisEnd > existingStart) {
          throw new AppError(
            409,
            'SLOT_OVERLAPS_EXISTING_BOOKING',
            'This slot overlaps with an existing booking. Please choose a different time.'
          );
        }
      }
    }

    // 2. ATOMIC COMPARE-AND-SWAP (Concurrency Centerpiece)
    // Only updates if status is currently 'AVAILABLE'
    const updatedSlot = await Slot.findOneAndUpdate(
      { _id: slotId, status: 'AVAILABLE' },
      { $set: { status: 'BOOKED' }, $inc: { version: 1 } },
      { new: true }
    );

    // If updatedSlot is null, another concurrent request won the race
    if (!updatedSlot) {
      throw new AppError(
        409,
        'SLOT_ALREADY_BOOKED',
        'This slot was just booked by another user. Please choose a different time slot.'
      );
    }

    // 3. Create the appointment document
    let appointment;
    try {
      appointment = await Appointment.create({
        userId,
        slotId: updatedSlot._id,
        status: 'BOOKED',
        notes: notes || '',
        bookedAt: new Date(),
        idempotencyKey
      });
    } catch (createError) {
      // A duplicate key means an identical request won just before this one.
      if ((createError as any)?.code === 11000 && idempotencyKey) {
        const existing = await Appointment.findOne({ userId, idempotencyKey })
          .populate('slotId')
          .populate('userId', 'name email');
        if (existing) {
          // This request held a slot briefly, but the duplicate request already
          // owns the appointment. Release only the slot lock created above.
          await Slot.updateOne({ _id: slotId, status: 'BOOKED' }, { $set: { status: 'AVAILABLE' } });
          res.status(200).json({
            success: true,
            data: { appointment: existing, slot: existing.slotId, status: existing.status, idempotentReplay: true }
          });
          return;
        }
      }
      // Rollback the slot lock if appointment record creation fails
      await Slot.updateOne({ _id: slotId }, { $set: { status: 'AVAILABLE' } });
      throw createError;
    }

    // 4. Real-time broadcast to all connected clients
    broadcastSlotUpdate(updatedSlot._id.toString(), 'BOOKED', updatedSlot);

    // Populate slot details before sending response
    const populated = await Appointment.findById(appointment._id)
      .populate('slotId')
      .populate('userId', 'name email');

    logger.info({ appointmentId: appointment._id, slotId, userId }, 'Appointment successfully booked');

    res.status(201).json({
      success: true,
      data: {
        appointment: populated,
        slot: updatedSlot,
        status: 'BOOKED'
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.user?.userId;
  const { filter } = req.query; // 'upcoming' | 'past' | 'all'

  try {
    const query: any = { userId };

    if (filter === 'cancelled') {
      query.status = 'CANCELLED';
    }

    const appointments = await Appointment.find(query)
      .populate('slotId')
      .sort({ createdAt: -1 });

    const now = new Date();

    // Categorize into upcoming and past
    const categorized = appointments.map(apt => {
      const aptObj = apt.toObject();
      const slot = aptObj.slotId as any;
      
      let isPast = false;
      if (slot && slot.date && slot.startTime) {
        const slotDateTime = new Date(`${slot.date}T${slot.startTime}:00`);
        isPast = slotDateTime < now;
      }

      return {
        ...aptObj,
        isPast
      };
    });

    let filtered = categorized;
    if (filter === 'upcoming') {
      filtered = categorized.filter(a => !a.isPast && a.status === 'BOOKED');
    } else if (filter === 'past') {
      filtered = categorized.filter(a => a.isPast || a.status !== 'BOOKED');
    }

    res.status(200).json({
      success: true,
      data: {
        total: filtered.length,
        appointments: filtered
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getAppointmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { id } = req.params;
  const userId = req.user?.userId;

  try {
    const appointment = await Appointment.findById(id)
      .populate('slotId')
      .populate('userId', 'name email');

    if (!appointment) {
      throw new AppError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found');
    }

    const appointmentUserId = (appointment.userId as any)._id 
      ? (appointment.userId as any)._id.toString() 
      : appointment.userId.toString();

    if (appointmentUserId !== userId && req.user?.role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN_ACTION', 'You do not have permission to view this appointment.');
    }

    res.status(200).json({
      success: true,
      data: { appointment }
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user?.userId;

  try {
    const appointment = await Appointment.findById(id).populate('slotId');
    if (!appointment) {
      throw new AppError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found');
    }

    const appointmentUserId = (appointment.userId as any)._id 
      ? (appointment.userId as any)._id.toString() 
      : appointment.userId.toString();

    if (appointmentUserId !== userId && req.user?.role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN_ACTION', 'You do not have permission to cancel someone else\'s appointment.');
    }

    if (appointment.status === 'CANCELLED') {
      throw new AppError(400, 'ALREADY_CANCELLED', 'This appointment has already been cancelled.');
    }

    // Slot time check: Disallow cancelling past appointments
    const slot = appointment.slotId as any;
    if (slot && slot.date && slot.startTime) {
      const now = new Date();
      const slotDateTime = new Date(`${slot.date}T${slot.startTime}:00`);
      if (slotDateTime < now) {
        throw new AppError(400, 'PAST_APPOINTMENT_CANNOT_BE_CANCELLED', 'Past appointments cannot be cancelled.');
      }
    }

    // 1. Mark appointment as CANCELLED
    appointment.status = 'CANCELLED';
    appointment.cancelledAt = new Date();
    appointment.cancellationReason = reason || 'Cancelled by user';
    await appointment.save();

    // 2. Atomically return slot to AVAILABLE pool
    const slotId = slot ? slot._id : appointment.slotId;
    const updatedSlot = await Slot.findByIdAndUpdate(slotId, {
      $set: { status: 'AVAILABLE' }
    }, { new: true });

    // 3. Real-time broadcast to all connected clients
    broadcastSlotUpdate(slotId.toString(), 'AVAILABLE', updatedSlot);

    logger.info({ appointmentId: appointment._id, slotId }, 'Appointment cancelled and slot freed in real-time');

    res.status(200).json({
      success: true,
      data: {
        message: 'Appointment successfully cancelled and slot returned to available pool.',
        appointment
      }
    });
  } catch (error) {
    next(error);
  }
}
