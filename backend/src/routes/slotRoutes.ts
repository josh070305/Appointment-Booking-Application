import { Router } from 'express';
import { getSlots, getAvailableDates, getSlotById, createSlot, createSlotSchema } from '../controllers/slotController.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

router.get('/', getSlots);
router.get('/dates', getAvailableDates);
router.get('/:id', getSlotById);
router.post('/', validateRequest({ body: createSlotSchema }), createSlot);

export default router;
