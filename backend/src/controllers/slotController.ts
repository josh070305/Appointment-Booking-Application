import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Slot } from '../models/Slot.js';
import { AppError } from '../middleware/errorHandler.js';

export const createSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be HH:mm (24h)'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'End time must be HH:mm (24h)'),
  serviceName: z.string().min(2, 'Service name is required'),
  providerName: z.string().optional().default('Dr. Sarah Smith'),
  location: z.string().optional().default('In-Clinic (Suite 401)'),
  durationMinutes: z.number().positive().optional().default(30),
  price: z.number().nonnegative().optional().default(50)
});

export async function getSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, service, status = 'AVAILABLE', timeOfDay } = req.query;

    const query: any = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (date) {
      query.date = date as string;
    } else {
      // By default, only show today and future dates
      query.date = { $gte: todayStr };
    }

    if (service && typeof service === 'string' && service.trim() !== '') {
      query.serviceName = { $regex: service.trim(), $options: 'i' };
    }

    const slots = await Slot.find(query).sort({ date: 1, startTime: 1 });

    const now = new Date();

    // Filter out past time slots if the date is today
    const validFutureSlots = slots.filter(slot => {
      if (slot.date > todayStr) return true;
      if (slot.date === todayStr) {
        const slotDateTime = new Date(`${slot.date}T${slot.startTime}:00`);
        return slotDateTime > now;
      }
      return false;
    });

    // Apply timeOfDay filter if requested
    let filteredSlots = validFutureSlots;
    if (timeOfDay && timeOfDay !== 'ALL') {
      filteredSlots = validFutureSlots.filter(slot => {
        const hour = parseInt(slot.startTime.split(':')[0], 10);
        if (timeOfDay === 'morning') return hour < 12;
        if (timeOfDay === 'afternoon') return hour >= 12 && hour < 17;
        if (timeOfDay === 'evening') return hour >= 17;
        return true;
      });
    }

    res.status(200).json({
      success: true,
      data: {
        total: filteredSlots.length,
        slots: filteredSlots
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getAvailableDates(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const results = await Slot.aggregate([
      {
        $match: {
          date: { $gte: today },
          status: 'AVAILABLE'
        }
      },
      {
        $group: {
          _id: '$date',
          count: { $sum: 1 },
          services: { $addToSet: '$serviceName' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const formatted = results.map(item => ({
      date: item._id,
      availableCount: item.count,
      services: item.services
    }));

    res.status(200).json({
      success: true,
      data: {
        dates: formatted
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getSlotById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const slot = await Slot.findById(req.params.id);
    if (!slot) {
      throw new AppError(404, 'SLOT_NOT_FOUND', 'Slot not found');
    }

    res.status(200).json({
      success: true,
      data: { slot }
    });
  } catch (error) {
    next(error);
  }
}

export async function createSlot(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const newSlot = await Slot.create(req.body);
    res.status(201).json({
      success: true,
      data: { slot: newSlot }
    });
  } catch (error) {
    next(error);
  }
}
