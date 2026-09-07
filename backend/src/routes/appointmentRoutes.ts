import { Router } from 'express';
import {
  bookAppointment,
  getUserAppointments,
  getAppointmentById,
  cancelAppointment,
  bookAppointmentSchema,
  cancelAppointmentSchema
} from '../controllers/appointmentController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { bookingLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// All appointment routes require authentication
router.use(requireAuth);

router.post('/', bookingLimiter, validateRequest({ body: bookAppointmentSchema }), bookAppointment);
router.get('/', getUserAppointments);
router.get('/:id', getAppointmentById);
router.post('/:id/cancel', validateRequest({ body: cancelAppointmentSchema }), cancelAppointment);
router.delete('/:id', validateRequest({ body: cancelAppointmentSchema }), cancelAppointment);

export default router;
